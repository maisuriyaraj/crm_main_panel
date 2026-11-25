"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";

import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { notify } from "@/lib/commonFunctions";
import { apiErrorCode, apiErrorMessage } from "@/lib/auth/errors";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToBulkUpdateLeads,
  reqToCreateLeadStatus,
  reqToCreatePipeline,
  reqToDeleteLeadStatus,
  reqToDeletePipeline,
  reqToGetLeadStatuses,
  reqToGetPipelines,
  reqToSetDefaultPipeline,
  reqToUpdateLeadStatus,
  reqToUpdatePipeline,
} from "@/lib/store/slices/leadsSlice";
import { mapLeadStatusFromApi } from "@/lib/leads/mappers";
import { OUTCOME_LABEL, stageOutcome, type LeadStage, type Pipeline } from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// The colours the backend seeds its own default stages with, offered as
// one-click presets. These are stage data saved to the server, not styling for
// this component, so they are literal values rather than theme tokens.
const STAGE_PRESETS = ["#94a3b8", "#f59e0b", "#38bdf8", "#22c55e", "#ef4444", "#6b7280"];

const DEFAULT_NEW_STAGE_COLOR = "#94a3b8";

// The backend refuses a stage delete while any lead still points at it. It
// sends no code for that one, so this is the sentence shown in its place.
const STAGE_IN_USE = "This stage still has leads in it. Move them to another stage first.";

interface PipelineSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The board the Leads screen is showing, so the dialog opens on it.
  activePipelineId: string | null;
  // Called after anything changes, so the screen reloads its stages and leads.
  onChanged: () => void;
  // Called when the pipeline the screen is showing is removed, so it can move
  // the member to another board rather than leave them on a missing one.
  onPipelineRemoved: (removedId: string) => void;
  canManage: boolean;
}

export function PipelineSettingsDialog({
  open,
  onOpenChange,
  activePipelineId,
  onChanged,
  onPipelineRemoved,
  canManage,
}: PipelineSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const pipelines = useAppSelector((state) => state.leads.pipelines);
  const busy = useAppSelector((state) => state.leads.pipelinesLoading || state.leads.statusesLoading);

  const [selectedId, setSelectedId] = useState<string | null>(activePipelineId);
  // The selected pipeline's stages, read here rather than from the slice: the
  // Leads screen behind this dialog keeps its own board's stages there, and
  // editing another pipeline must not swap the board out underneath it.
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);

  const [newPipelineName, setNewPipelineName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [newStageName, setNewStageName] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageDraftName, setStageDraftName] = useState("");

  const [pipelineToRemove, setPipelineToRemove] = useState<Pipeline | null>(null);
  // A stage the member tried to delete that still holds leads, with somewhere
  // to move them to.
  const [stageInUse, setStageInUse] = useState<LeadStage | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>("");

  const selected = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedId) ?? null,
    [pipelines, selectedId],
  );

  const failed = (fallback: string) => (error: unknown) =>
    notify(apiErrorMessage(error, fallback), { type: "error" });

  const loadStages = useCallback(async (pipelineId: string) => {
    setStagesLoading(true);
    try {
      const response = await Axios.get(apiRoutes.leadStatuses, { params: { pipeline_id: pipelineId } });
      setStages((response.data?.data ?? []).map(mapLeadStatusFromApi));
    } catch (error) {
      setStages([]);
      notify(apiErrorMessage(error, "Couldn't load this pipeline's stages."), { type: "error" });
    } finally {
      setStagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    dispatch(reqToGetPipelines({ data: null }));
    setSelectedId(activePipelineId);
  }, [open, activePipelineId, dispatch]);

  // Nothing is selected yet on first open, or the selected board has just been
  // removed: fall back to the default one.
  useEffect(() => {
    if (!open || !pipelines.length) return;
    if (selectedId && pipelines.some((pipeline) => pipeline.id === selectedId)) return;
    setSelectedId((pipelines.find((pipeline) => pipeline.isDefault) ?? pipelines[0]).id);
  }, [open, pipelines, selectedId]);

  useEffect(() => {
    if (!open || !selectedId) return;
    loadStages(selectedId);
  }, [open, selectedId, loadStages]);

  const ordered = useMemo(() => [...stages].sort((a, b) => a.sortOrder - b.sortOrder), [stages]);

  const refreshAll = (pipelineId?: string | null) => {
    dispatch(reqToGetPipelines({ data: null }));
    const target = pipelineId ?? selectedId;
    if (target) loadStages(target);
    onChanged();
  };

  // ─── Pipelines ─────────────────────────────────────────────────────────────

  const addPipeline = () => {
    const name = newPipelineName.trim();
    if (!name) return;
    dispatch(
      reqToCreatePipeline({
        data: { name },
        onSuccess: (response: any) => {
          setNewPipelineName("");
          notify(`${name} created, with the six default stages.`, { type: "success" });
          const created = response?.data?.id;
          if (created) setSelectedId(String(created));
          refreshAll(created ? String(created) : null);
        },
        onFailure: failed("Couldn't create the pipeline. Please try again."),
      }),
    );
  };

  const saveRename = (pipeline: Pipeline) => {
    const name = renameValue.trim();
    if (!name || name === pipeline.name) {
      setRenamingId(null);
      return;
    }
    dispatch(
      reqToUpdatePipeline({
        data: { id: pipeline.id, name },
        onSuccess: () => {
          setRenamingId(null);
          notify("Pipeline renamed.", { type: "success" });
          refreshAll();
        },
        onFailure: failed("Couldn't rename the pipeline. Please try again."),
      }),
    );
  };

  const makeDefault = (pipeline: Pipeline) => {
    dispatch(
      reqToSetDefaultPipeline({
        data: { id: pipeline.id },
        onSuccess: () => {
          notify(`${pipeline.name} is now the default pipeline.`, { type: "success" });
          refreshAll();
        },
        onFailure: failed("Couldn't change the default pipeline. Please try again."),
      }),
    );
  };

  const removePipeline = (pipeline: Pipeline) => {
    dispatch(
      reqToDeletePipeline({
        data: { id: pipeline.id },
        onSuccess: () => {
          setPipelineToRemove(null);
          notify(`${pipeline.name} removed.`, { type: "success" });
          if (pipeline.id === activePipelineId) onPipelineRemoved(pipeline.id);
          setSelectedId(null);
          refreshAll(null);
        },
        onFailure: (error: unknown) => {
          setPipelineToRemove(null);
          failed("Couldn't remove the pipeline. Please try again.")(error);
        },
      }),
    );
  };

  // ─── Stages ────────────────────────────────────────────────────────────────

  const addStage = () => {
    const name = newStageName.trim();
    if (!name || !selectedId) return;
    const sortOrder = ordered.length ? ordered[ordered.length - 1].sortOrder + 1 : 0;
    dispatch(
      reqToCreateLeadStatus({
        data: { name, color: DEFAULT_NEW_STAGE_COLOR, sort_order: sortOrder, pipeline_id: selectedId },
        onSuccess: () => {
          setNewStageName("");
          notify(`${name} added.`, { type: "success" });
          refreshAll();
        },
        onFailure: failed("Couldn't add the stage. Please try again."),
      }),
    );
  };

  const patchStage = (stage: LeadStage, body: Record<string, unknown>, done: string, fallback: string) => {
    dispatch(
      reqToUpdateLeadStatus({
        data: { id: stage.id, ...body },
        onSuccess: () => {
          notify(done, { type: "success" });
          refreshAll();
        },
        onFailure: failed(fallback),
      }),
    );
  };

  const saveStageName = (stage: LeadStage) => {
    const name = stageDraftName.trim();
    if (!name || name === stage.name) {
      setEditingStageId(null);
      return;
    }
    setEditingStageId(null);
    patchStage(stage, { name }, "Stage renamed.", "Couldn't rename the stage. Please try again.");
  };

  // Reordering swaps the two stages' sort_order, one request each, so the list
  // stays in a sensible order even if the second one fails.
  const moveStage = (index: number, direction: -1 | 1) => {
    const stage = ordered[index];
    const swapWith = ordered[index + direction];
    if (!stage || !swapWith) return;
    dispatch(
      reqToUpdateLeadStatus({
        data: { id: stage.id, sort_order: swapWith.sortOrder },
        onSuccess: () => {
          dispatch(
            reqToUpdateLeadStatus({
              data: { id: swapWith.id, sort_order: stage.sortOrder },
              onSuccess: () => refreshAll(),
              onFailure: failed("Couldn't reorder the stages. Please try again."),
            }),
          );
        },
        onFailure: failed("Couldn't reorder the stages. Please try again."),
      }),
    );
  };

  // "open" clears both flags; the backend treats won and lost as separate
  // booleans, so only one is ever set at a time here.
  const setOutcome = (stage: LeadStage, outcome: "open" | "won" | "lost") => {
    patchStage(
      stage,
      { is_won: outcome === "won", is_lost: outcome === "lost" },
      outcome === "open" ? `${stage.name} no longer closes a lead.` : `${stage.name} now closes a lead as ${OUTCOME_LABEL[outcome]}.`,
      "Couldn't change the stage outcome. Please try again.",
    );
  };

  const deleteStage = (stage: LeadStage) => {
    dispatch(
      reqToDeleteLeadStatus({
        data: { id: stage.id },
        onSuccess: () => {
          notify(`${stage.name} removed.`, { type: "success" });
          refreshAll();
        },
        onFailure: (error: unknown) => {
          // "Leads still in this stage" is the one refusal here that carries no
          // code, so a plain 400 is taken as that and the member is offered
          // somewhere to move them. Anything else is shown as itself.
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 400 && !apiErrorCode(error)) {
            setStageInUse(stage);
            setMoveTargetId("");
            return;
          }
          failed("Couldn't remove the stage. Please try again.")(error);
        },
      }),
    );
  };

  // Moves every lead the member can see out of the stage, then removes it. The
  // count is read first because a "move everything matching" is only accepted
  // with the number the caller was shown.
  const moveLeadsThenDelete = async (stage: LeadStage, targetStageId: string) => {
    if (!selectedId) return;
    let total = 0;
    try {
      const response = await Axios.get(apiRoutes.leads, {
        params: { pipeline_id: selectedId, status_id: stage.id, page: 1, per_page: 10 },
      });
      total = Number(response.data?.pagination?.total ?? 0);
    } catch (error) {
      notify(apiErrorMessage(error, "Couldn't count this stage's leads. Please try again."), { type: "error" });
      return;
    }

    if (total === 0) {
      // Nothing left for this member to move: whatever blocks the delete is
      // outside their record scope, so someone with wider access must do it.
      notify("This stage has leads you can't see. Ask someone with access to all leads to move them.", { type: "error" });
      setStageInUse(null);
      return;
    }

    dispatch(
      reqToBulkUpdateLeads({
        data: {
          scope: "all_matching",
          filters: { pipeline_id: selectedId, status_id: stage.id },
          expected_count: total,
          data: { status_id: targetStageId },
        },
        onSuccess: () => {
          setStageInUse(null);
          notify(`Moved ${total} lead(s).`, { type: "success" });
          deleteStage(stage);
        },
        onFailure: failed("Couldn't move this stage's leads. Please try again."),
      }),
    );
  };

  const onlyPipeline = pipelines.length <= 1;
  // A stage that asks for a reason cannot take a batch of leads: the bulk
  // endpoint has no way to carry one.
  const moveTargets = ordered.filter((stage) => stage.id !== stageInUse?.id && !stage.requiresReason);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pipelines and stages</DialogTitle>
            <DialogDescription>
              Each lead sits on one pipeline and moves through its stages. The default pipeline is the one Leads opens on.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            {/* Pipelines */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Pipelines</Label>
              <div className="space-y-1">
                {pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className={cn(
                      "rounded-md border border-transparent px-2 py-1.5",
                      pipeline.id === selectedId && "border-border bg-muted/50",
                    )}
                  >
                    {renamingId === pipeline.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && saveRename(pipeline)}
                          className="h-7 text-sm"
                          maxLength={100}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveRename(pipeline)} aria-label="Save name">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRenamingId(null)} aria-label="Cancel rename">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="flex-1 truncate text-left text-sm"
                          onClick={() => setSelectedId(pipeline.id)}
                        >
                          {pipeline.name}
                          {pipeline.isDefault && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">Default</Badge>
                          )}
                        </button>
                        {canManage && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setRenamingId(pipeline.id);
                                setRenameValue(pipeline.name);
                              }}
                              aria-label={`Rename ${pipeline.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!pipeline.isDefault && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => makeDefault(pipeline)}
                                aria-label={`Make ${pipeline.name} the default`}
                              >
                                <Star className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <RemoveButton
                              disabled={onlyPipeline || busy}
                              reason={onlyPipeline ? "This is your only pipeline, so it can't be removed." : undefined}
                              label={`Remove ${pipeline.name}`}
                              onClick={() => setPipelineToRemove(pipeline)}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {canManage && (
                <div className="flex items-center gap-1 pt-2">
                  <Input
                    value={newPipelineName}
                    onChange={(event) => setNewPipelineName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addPipeline()}
                    placeholder="New pipeline"
                    className="h-8 text-sm"
                    maxLength={100}
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={addPipeline} disabled={!newPipelineName.trim() || busy} aria-label="Add pipeline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Stages of the selected pipeline */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                {selected ? `${selected.name} — stages` : "Stages"}
              </Label>

              {stagesLoading && <p className="text-sm text-muted-foreground">Loading stages…</p>}
              {!stagesLoading && ordered.length === 0 && (
                <p className="text-sm text-muted-foreground">This pipeline has no stages yet. Add the first one below.</p>
              )}

              <div className="space-y-2">
                {ordered.map((stage, index) => {
                  const outcome = stageOutcome(stage);
                  return (
                    <div key={stage.id} className="rounded-md border border-border p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={/^#[0-9a-f]{6}$/i.test(stage.color) ? stage.color : DEFAULT_NEW_STAGE_COLOR}
                          onChange={(event) =>
                            patchStage(stage, { color: event.target.value }, "Stage colour changed.", "Couldn't change the colour. Please try again.")
                          }
                          disabled={!canManage}
                          className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
                          aria-label={`Colour for ${stage.name}`}
                        />

                        {editingStageId === stage.id ? (
                          <Input
                            value={stageDraftName}
                            onChange={(event) => setStageDraftName(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && saveStageName(stage)}
                            onBlur={() => saveStageName(stage)}
                            className="h-7 flex-1 text-sm"
                            maxLength={100}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className="flex-1 truncate text-left text-sm font-medium disabled:cursor-default"
                            disabled={!canManage}
                            onClick={() => {
                              setEditingStageId(stage.id);
                              setStageDraftName(stage.name);
                            }}
                          >
                            {stage.name}
                          </button>
                        )}

                        {outcome && (
                          <Badge variant={outcome === "won" ? "default" : "destructive"} className="text-[10px]">
                            {OUTCOME_LABEL[outcome]}
                          </Badge>
                        )}

                        {canManage && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={index === 0}
                              onClick={() => moveStage(index, -1)}
                              aria-label={`Move ${stage.name} up`}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={index === ordered.length - 1}
                              onClick={() => moveStage(index, 1)}
                              aria-label={`Move ${stage.name} down`}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <RemoveButton label={`Remove ${stage.name}`} onClick={() => deleteStage(stage)} disabled={busy} />
                          </>
                        )}
                      </div>

                      {canManage && (
                        <div className="mt-2 flex flex-wrap items-center gap-4 pl-8">
                          <Select value={outcome ?? "open"} onValueChange={(value) => setOutcome(stage, value as "open" | "won" | "lost")}>
                            <SelectTrigger className="h-7 w-36 text-xs" aria-label={`Outcome for ${stage.name}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Stays open</SelectItem>
                              <SelectItem value="won">Closes as won</SelectItem>
                              <SelectItem value="lost">Closes as lost</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-2">
                            <Switch
                              id={`reason-${stage.id}`}
                              checked={!!stage.requiresReason}
                              onCheckedChange={(checked) =>
                                patchStage(
                                  stage,
                                  { requires_reason: checked },
                                  checked ? `${stage.name} now needs a reason.` : `${stage.name} no longer needs a reason.`,
                                  "Couldn't change the stage rule. Please try again.",
                                )
                              }
                            />
                            <Label htmlFor={`reason-${stage.id}`} className="text-xs font-normal text-muted-foreground">
                              Require a reason
                            </Label>
                          </div>

                          <div className="flex items-center gap-1">
                            {STAGE_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                title={`Use ${preset}`}
                                aria-label={`Use colour ${preset}`}
                                className="h-4 w-4 rounded-full border border-border"
                                style={{ backgroundColor: preset }}
                                onClick={() =>
                                  patchStage(stage, { color: preset }, "Stage colour changed.", "Couldn't change the colour. Please try again.")
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {canManage && selected && (
                <div className="flex items-center gap-1 pt-2">
                  <Input
                    value={newStageName}
                    onChange={(event) => setNewStageName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addStage()}
                    placeholder="New stage"
                    className="h-8 text-sm"
                    maxLength={100}
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={addStage} disabled={!newStageName.trim() || busy} aria-label="Add stage">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pipelineToRemove} onOpenChange={(open) => !open && setPipelineToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pipelineToRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its stages go with it. This is only possible while no leads are on this pipeline — move them to another one first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pipelineToRemove && removePipeline(pipelineToRemove)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!stageInUse} onOpenChange={(open) => !open && setStageInUse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{stageInUse?.name} still has leads</AlertDialogTitle>
            <AlertDialogDescription>{STAGE_IN_USE}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="move-target">Move its leads to</Label>
            <Select value={moveTargetId} onValueChange={setMoveTargetId}>
              <SelectTrigger id="move-target"><SelectValue placeholder="Choose a stage" /></SelectTrigger>
              <SelectContent>
                {moveTargets.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {moveTargets.length === 0 && (
              <p className="text-xs text-muted-foreground">
                There is nowhere to move them: add another stage that does not require a reason first.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!moveTargetId}
              onClick={(event) => {
                // Keeps the dialog up while the move runs, so a failure can be
                // shown against the choice that caused it.
                event.preventDefault();
                if (stageInUse && moveTargetId) moveLeadsThenDelete(stageInUse, moveTargetId);
              }}
            >
              Move and remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// A delete button that says why it cannot be used, rather than being quietly dead.
function RemoveButton({
  disabled,
  reason,
  label,
  onClick,
}: {
  disabled?: boolean;
  reason?: string;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-destructive"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );

  if (!reason) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        {/* A disabled button gets no pointer events, so the span carries the tooltip. */}
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
