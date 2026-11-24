"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, Check, ChevronDown, Pencil, Save, Star, StarOff, Trash2 } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  listSlotOf,
  reqToClearDefaultSavedView,
  reqToCreateSavedView,
  reqToDeleteSavedView,
  reqToGetSavedViews,
  reqToSetDefaultSavedView,
  reqToUpdateSavedView,
} from "@/lib/store/slices/listViewsSlice";
import {
  cleanFilters,
  columnsToApi,
  mapSavedViewFromApi,
  type ListColumnChoice,
  type ListSort,
  type ListVisibility,
  type SavedView,
} from "@/lib/lists/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// The saved views bar above a list (SRS SH-L4, the brief's "VIEW FILTER").
// Picking a view applies its filters, sort, columns and view mode in one go;
// saving one captures whatever is on screen right now.
//
// Only the member who created a view may change or remove it, however widely it
// is shared — the API refuses the rest with NOT_VIEW_OWNER, so the menu does not
// offer those actions in the first place.

export interface SavedViewsBarProps {
  listKey: string;
  // What "save current as view" should capture.
  current: {
    filters: Record<string, string | undefined>;
    sort: ListSort;
    columns?: ListColumnChoice[];
    viewMode?: string;
  };
  activeViewId: string | null;
  // Called with the view to apply, or null for "no view" (the screen's own
  // defaults). The list screen owns its filter state, so it does the applying.
  onApply: (view: SavedView | null) => void;
}

export function SavedViewsBar({ listKey, current, activeViewId, onApply }: SavedViewsBarProps) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((state) => listSlotOf(state.listViews as any, listKey));
  const views = slot.views;
  const defaultViewId = slot.defaultViewId;

  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [visibility, setVisibility] = React.useState<ListVisibility>("private");
  const [makeDefault, setMakeDefault] = React.useState(false);
  const [deleting, setDeleting] = React.useState<SavedView | null>(null);

  const active = views.find((view) => view.id === activeViewId) ?? null;
  const mine = views.filter((view) => view.isMine);
  const shared = views.filter((view) => !view.isMine);

  const refresh = () => dispatch(reqToGetSavedViews({ data: { listKey } }));
  const failed = (fallback: string) => (error: any) =>
    notify(error?.response?.data?.message ?? fallback, { type: "error" });

  const body = () => ({
    filters: cleanFilters(current.filters),
    sort: { sort_by: current.sort.sortBy, sort_dir: current.sort.sortDir },
    columns: current.columns ? columnsToApi(current.columns) : undefined,
    view_mode: current.viewMode,
  });

  const create = () => {
    if (!name.trim()) return;
    dispatch(
      reqToCreateSavedView({
        data: {
          listKey,
          body: { list_key: listKey, name: name.trim(), visibility, is_default: makeDefault, ...body() },
        },
        onSuccess: (response: any) => {
          notify("View saved.", { type: "success" });
          setSaveOpen(false);
          setName("");
          setMakeDefault(false);
          refresh();
          // Switch to what was just saved, so the bar shows the member's own view
          // rather than "All records" over the same filters.
          if (response?.data) onApply(mapSavedViewFromApi(response.data));
        },
        onFailure: failed("Couldn't save this view."),
      }),
    );
  };

  // Overwrites the view with what is on screen now. `version` is the one that
  // was read, so a view the member changed in another tab is refused instead of
  // silently losing that change.
  const overwrite = (view: SavedView) => {
    dispatch(
      reqToUpdateSavedView({
        data: { listKey, id: view.id, body: { version: view.version, ...body() } },
        onSuccess: () => {
          notify(`"${view.name}" updated.`, { type: "success" });
          refresh();
        },
        onFailure: failed("Couldn't update this view."),
      }),
    );
  };

  const remove = (view: SavedView) => {
    dispatch(
      reqToDeleteSavedView({
        data: { listKey, id: view.id },
        onSuccess: () => {
          notify(`"${view.name}" deleted.`, { type: "success" });
          setDeleting(null);
          if (activeViewId === view.id) onApply(null);
          refresh();
        },
        onFailure: failed("Couldn't delete this view."),
      }),
    );
  };

  const setDefault = (view: SavedView) => {
    dispatch(
      reqToSetDefaultSavedView({
        data: { listKey, id: view.id },
        onSuccess: () => {
          notify(`"${view.name}" is now your default.`, { type: "success" });
          refresh();
        },
        onFailure: failed("Couldn't set your default view."),
      }),
    );
  };

  const clearDefault = () => {
    dispatch(
      reqToClearDefaultSavedView({
        data: { listKey },
        onSuccess: () => {
          notify("Default view cleared.", { type: "success" });
          refresh();
        },
        onFailure: failed("Couldn't clear your default view."),
      }),
    );
  };

  const item = (view: SavedView) => (
    <DropdownMenuItem key={view.id} onSelect={() => onApply(view)} className="gap-2">
      {view.id === activeViewId ? <Check className="h-4 w-4" /> : <span className="w-4" />}
      <span className="flex-1 truncate">{view.name}</span>
      {view.visibility === "shared" && (
        <Badge variant="outline" className="text-[10px]">
          Shared
        </Badge>
      )}
      {view.id === defaultViewId && <Star className="h-3.5 w-3.5 fill-current" aria-label="Your default" />}
    </DropdownMenuItem>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {active ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span className="max-w-48 truncate">{active ? active.name : "All records"}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuItem onSelect={() => onApply(null)} className="gap-2">
            {activeViewId === null ? <Check className="h-4 w-4" /> : <span className="w-4" />}
            <span className="flex-1">All records</span>
          </DropdownMenuItem>

          {mine.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">My views</DropdownMenuLabel>
              {mine.map(item)}
            </>
          )}

          {shared.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Shared with the team</DropdownMenuLabel>
              {shared.map(item)}
            </>
          )}

          {views.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No saved views yet. Set your filters, then save them as a view.
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(true)} disabled={slot.isSaving}>
        <Save className="h-4 w-4" />
        Save current as view
      </Button>

      {active && (
        <>
          {active.isMine && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => overwrite(active)} disabled={slot.isSaving}>
                <Pencil className="h-4 w-4" />
                Update this view
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(active)} disabled={slot.isSaving}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}

          {active.id === defaultViewId ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearDefault} disabled={slot.isSaving}>
              <StarOff className="h-4 w-4" />
              Not my default
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDefault(active)} disabled={slot.isSaving}>
              <Star className="h-4 w-4" />
              Make default
            </Button>
          )}
        </>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              Keeps the filters, sort, columns and layout you have on screen now.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="saved-view-name">Name</Label>
              <Input
                id="saved-view-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Hot leads this week"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Who can use it</Label>
              <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as ListVisibility)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="private" id="view-private" />
                  <Label htmlFor="view-private" className="font-normal">
                    Only me
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="shared" id="view-shared" />
                  <Label htmlFor="view-shared" className="font-normal">
                    Everyone in my organization
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="view-default"
                checked={makeDefault}
                onCheckedChange={(checked) => setMakeDefault(checked === true)}
              />
              <Label htmlFor="view-default" className="font-normal">
                Open this list with this view
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={create} disabled={!name.trim() || slot.isSaving}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleting?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.visibility === "shared"
                ? "This view is shared, so it disappears for everyone in your organization. The records themselves are not touched."
                : "The records themselves are not touched."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove(deleting)}>Delete view</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
