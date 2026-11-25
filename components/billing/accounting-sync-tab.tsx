"use client";

import { useEffect, useState } from "react";
import { Download, Link2, Link2Off, Plug, RefreshCw, RotateCcw } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { apiRoutes, apiUrl } from "@/lib/constants";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToConnectAccounting,
  reqToDisconnectAccounting,
  reqToGetAccounting,
  reqToGetAccountingSyncItems,
  reqToRetryAccountingSync,
  reqToTestAccounting,
  reqToUpdateAccountingSettings,
  type AccountingConnection,
} from "@/lib/store/slices/billingSettingsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Plain words for each credential a provider asks for, and where the tenant finds it.
const FIELD_LABELS: Record<string, { label: string; help?: string; secret?: boolean }> = {
  client_id: { label: "Client id" },
  client_secret: { label: "Client secret", secret: true },
  refresh_token: { label: "Refresh token", secret: true, help: "From the self-client or app you authorised in your own account." },
  data_centre: { label: "Data centre", help: "in, com, eu, au, jp or ca — the region your account lives in." },
  environment: { label: "Environment", help: "production, or sandbox while you are testing." },
};

// The non-secret choices, which decide where a document lands in the tenant's books.
const SETTING_LABELS: Record<string, { label: string; help?: string }> = {
  tally_company_name: { label: "Tally company name", help: "Exactly as it appears in Tally, or the import is refused." },
  tally_sales_ledger: { label: "Sales ledger" },
  tally_cgst_ledger: { label: "CGST ledger" },
  tally_sgst_ledger: { label: "SGST ledger" },
  tally_igst_ledger: { label: "IGST ledger" },
  tally_round_off_ledger: { label: "Round-off ledger" },
  quickbooks_item_id: { label: "QuickBooks item id", help: "The income item invoice lines post to. QuickBooks needs one on every line." },
  quickbooks_tax_code_id: { label: "QuickBooks tax code id", help: "Optional. Left blank, QuickBooks applies its own default." },
};

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  synced: "secondary",
  pending: "default",
  running: "default",
  failed: "destructive",
  skipped: "outline",
};

export function AccountingSyncTab({ canManage }: { canManage: boolean }) {
  const dispatch = useAppDispatch();
  const { accounting, syncItems, syncableEntities, accountingNotes } = useAppSelector((state) => state.billingSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(reqToGetAccountingSyncItems({ data: null }));
  }, [dispatch]);

  const anyConnected = accounting.some((row) => row.connected);

  return (
    <div className="space-y-6">
      {/* The whole point of the tab, said before any form: there is nothing to sync yet. */}
      {syncableEntities.length === 0 && (
        <Alert>
          <AlertTitle>Nothing can be synced yet</AlertTitle>
          <AlertDescription>
            OrbitOps cannot create a client invoice yet, so there is no document to push into your accounts. Connect
            your accounting software now if you like — it is saved, and syncing starts by itself as soon as invoicing
            ships.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t do that</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {accounting.map((connection) => (
          <ConnectionCard
            key={connection.provider}
            connection={connection}
            canManage={canManage}
            canExport={syncableEntities.includes("invoice")}
            onError={setError}
          />
        ))}
      </div>

      {accountingNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Worth knowing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {accountingNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* The history is only worth a table once something could be in it. */}
      {(anyConnected || syncItems.length > 0) && (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle>What has been synced</CardTitle>
              <CardDescription>
                One row per record and accounting system, with the id it was given there.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => dispatch(reqToGetAccountingSyncItems({ data: null }))}>
              <RefreshCw className="size-4" aria-hidden /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {syncItems.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Nothing has been synced yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Their reference</TableHead>
                    <TableHead>Last problem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.entity} #{item.entityId}
                      </TableCell>
                      <TableCell>{item.provider.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_TONE[item.status] ?? "default"}>{item.status}</Badge>
                        {item.attempts > 1 && (
                          <span className="ml-2 text-xs text-muted-foreground">{item.attempts} tries</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.externalNumber ?? item.externalId ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={item.lastError ?? undefined}>
                        {item.lastError ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConnectionCard({
  connection,
  canManage,
  canExport,
  onError,
}: {
  connection: AccountingConnection;
  canManage: boolean;
  canExport: boolean;
  onError: (message: string | null) => void;
}) {
  const dispatch = useAppDispatch();
  const { isSaving } = useAppSelector((state) => state.billingSettings);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [orgId, setOrgId] = useState(connection.externalOrgId ?? "");
  const [settings, setSettings] = useState<Record<string, string>>(() => settingsToForm(connection));
  const [disconnecting, setDisconnecting] = useState(false);

  // A save answers with the stored connection, so the form follows what was kept.
  useEffect(() => {
    setOrgId(connection.externalOrgId ?? "");
    setSettings(settingsToForm(connection));
    setCredentials({});
  }, [connection]);

  const isFile = connection.kind === "file";
  const failed = connection.counts.failed ?? 0;

  const connect = async () => {
    onError(null);
    const action = await dispatch(reqToConnectAccounting({
      data: {
        provider: connection.provider,
        credentials,
        external_org_id: connection.needsExternalOrgId ? orgId.trim() : undefined,
        settings: formToSettings(settings),
      },
      onFailure: (failure) => onError(apiErrorMessage(failure, `Couldn't connect ${connection.label}.`)),
    }));
    if (reqToConnectAccounting.fulfilled.match(action)) {
      notify(`${connection.label} connected.`, { type: "success" });
      dispatch(reqToGetAccounting({ data: null }));
    }
  };

  const saveSettings = async () => {
    onError(null);
    const action = await dispatch(reqToUpdateAccountingSettings({
      data: { provider: connection.provider, settings: formToSettings(settings) },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't save those settings.")),
    }));
    if (reqToUpdateAccountingSettings.fulfilled.match(action)) {
      notify("Settings saved.", { type: "success" });
    }
  };

  const toggleAutoSync = async (checked: boolean) => {
    onError(null);
    const action = await dispatch(reqToUpdateAccountingSettings({
      data: { provider: connection.provider, auto_sync: checked },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't change automatic sync.")),
    }));
    if (reqToUpdateAccountingSettings.fulfilled.match(action)) {
      notify(checked ? "New invoices will be pushed automatically." : "Automatic sync turned off.", { type: "success" });
    }
  };

  const test = async () => {
    onError(null);
    const action = await dispatch(reqToTestAccounting({
      data: { provider: connection.provider },
      onFailure: (failure) => onError(apiErrorMessage(failure, `Couldn't reach ${connection.label}.`)),
    }));
    if (reqToTestAccounting.fulfilled.match(action)) {
      notify(action.payload.message, { type: "success" });
      dispatch(reqToGetAccounting({ data: null }));
    }
  };

  const retry = async () => {
    onError(null);
    const action = await dispatch(reqToRetryAccountingSync({
      data: { provider: connection.provider },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't queue those records again.")),
    }));
    if (reqToRetryAccountingSync.fulfilled.match(action)) {
      notify(`${action.payload.queued} record${action.payload.queued === 1 ? "" : "s"} queued again.`, { type: "success" });
      dispatch(reqToGetAccountingSyncItems({ data: null }));
    }
  };

  const disconnect = async () => {
    onError(null);
    const action = await dispatch(reqToDisconnectAccounting({
      data: { provider: connection.provider },
      onFailure: (failure) => onError(apiErrorMessage(failure, `Couldn't disconnect ${connection.label}.`)),
    }));
    if (reqToDisconnectAccounting.fulfilled.match(action)) {
      notify(`${connection.label} disconnected.`, { type: "success" });
    }
    setDisconnecting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Plug className="size-5 text-primary" aria-hidden /> {connection.label}
          {connection.connected
            ? <Badge variant={connection.status === "error" ? "destructive" : "secondary"}>{connection.status === "error" ? "Needs attention" : "Connected"}</Badge>
            : <Badge variant="outline">Not connected</Badge>}
          {isFile && <Badge variant="outline">File import</Badge>}
        </CardTitle>
        <CardDescription>
          {isFile
            ? "Tally keeps your books on your own machine, so OrbitOps cannot post into it. It builds the voucher file instead, and you import it in Tally."
            : `Pushes clients, invoices and payments into ${connection.label} over its API.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {connection.lastError && (
          <Alert variant="destructive">
            <AlertTitle>Last problem</AlertTitle>
            <AlertDescription>{connection.lastError}</AlertDescription>
          </Alert>
        )}

        {connection.connected && (
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {connection.externalOrgId && (
              <p>
                {connection.externalOrgIdLabel ?? "Account id"}:{" "}
                <span className="font-mono text-foreground">{connection.externalOrgId}</span>
              </p>
            )}
            <p>Last synced: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : "never"}</p>
            {Object.keys(connection.counts).length > 0 && (
              <p className="sm:col-span-2">
                {Object.entries(connection.counts).map(([status, count]) => `${count} ${status}`).join(" · ")}
              </p>
            )}
          </div>
        )}

        {canManage && !isFile && (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">
              {connection.connected ? "Replace the credentials" : `Connect your ${connection.label} account`}
            </p>
            <p className="text-sm text-muted-foreground">
              These are your own credentials, from your own {connection.label} account. They are stored encrypted and
              never shown again.
            </p>

            {connection.credentialFields.map((field) => {
              const meta = FIELD_LABELS[field] ?? { label: field };
              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`${connection.provider}-${field}`}>
                    {meta.label}
                    {connection.credentials[field] === "set" && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">stored</span>
                    )}
                  </Label>
                  <Input
                    id={`${connection.provider}-${field}`}
                    type={meta.secret ? "password" : "text"}
                    autoComplete="off"
                    value={credentials[field] ?? ""}
                    placeholder={connection.credentials[field] === "set" ? "Leave blank to keep what is stored" : ""}
                    disabled={isSaving}
                    onChange={(event) => setCredentials((current) => ({ ...current, [field]: event.target.value }))}
                  />
                  {meta.help && <p className="text-sm text-muted-foreground">{meta.help}</p>}
                </div>
              );
            })}

            {connection.needsExternalOrgId && (
              <div className="space-y-2">
                <Label htmlFor={`${connection.provider}-org`}>{connection.externalOrgIdLabel}</Label>
                <Input
                  id={`${connection.provider}-org`}
                  value={orgId}
                  disabled={isSaving}
                  onChange={(event) => setOrgId(event.target.value)}
                />
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {connection.connected && (
                <Button variant="outline" onClick={test} disabled={isSaving}>
                  <Link2 className="size-4" aria-hidden /> Test connection
                </Button>
              )}
              <Button onClick={connect} disabled={isSaving}>
                {isSaving ? "Saving…" : connection.connected ? "Save credentials" : "Connect"}
              </Button>
            </div>
          </div>
        )}

        {/* Where documents land in the tenant's own books. Wrong here means a refused
            import or a posting in the wrong account, so it is asked for plainly. */}
        {connection.settingFields.length > 0 && (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Where things should post</p>
            {connection.missingSettings.length > 0 && (
              <Alert>
                <AlertTitle>Still needed</AlertTitle>
                <AlertDescription>
                  {connection.missingSettings.map((key) => SETTING_LABELS[key]?.label ?? key).join(", ")}
                </AlertDescription>
              </Alert>
            )}
            {connection.settingFields.map((field) => {
              const meta = SETTING_LABELS[field] ?? { label: field };
              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`${connection.provider}-set-${field}`}>{meta.label}</Label>
                  <Input
                    id={`${connection.provider}-set-${field}`}
                    value={settings[field] ?? ""}
                    disabled={!canManage || isSaving}
                    onChange={(event) => setSettings((current) => ({ ...current, [field]: event.target.value }))}
                  />
                  {meta.help && <p className="text-sm text-muted-foreground">{meta.help}</p>}
                </div>
              );
            })}
            {canManage && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={saveSettings} disabled={isSaving || !connection.connected}>
                  Save where things post
                </Button>
              </div>
            )}
          </div>
        )}

        {connection.connected && !isFile && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
              <Label htmlFor={`${connection.provider}-auto`}>Push new invoices automatically</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Each invoice goes into {connection.label} as it is issued. With this off, you push them yourself.
              </p>
            </div>
            <Switch
              id={`${connection.provider}-auto`}
              checked={connection.autoSync}
              disabled={!canManage || isSaving}
              onCheckedChange={toggleAutoSync}
            />
          </div>
        )}

        {connection.connected && (
          <div className="flex flex-wrap justify-end gap-2">
            {/* The voucher file holds invoices, so there is nothing to build until
                invoices exist. A disabled button says so rather than handing over a
                link that would answer with an error. */}
            {isFile && canManage && (
              <Button variant="outline" disabled={!canExport} asChild={canExport}>
                {canExport ? (
                  <a href={apiUrl(apiRoutes.billingSettingsTallyExport)} download>
                    <Download className="size-4" aria-hidden /> Download voucher file
                  </a>
                ) : (
                  <span>
                    <Download className="size-4" aria-hidden /> No invoices to export yet
                  </span>
                )}
              </Button>
            )}
            {!isFile && canManage && failed > 0 && (
              <Button variant="outline" onClick={retry} disabled={isSaving}>
                <RotateCcw className="size-4" aria-hidden /> Try the {failed} failed again
              </Button>
            )}
            {canManage && (
              <Button variant="outline" onClick={() => setDisconnecting(true)} disabled={isSaving}>
                <Link2Off className="size-4" aria-hidden /> Disconnect
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={disconnecting} onOpenChange={setDisconnecting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {connection.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your credentials are deleted and nothing more is pushed. What has already been synced is remembered, so
              reconnecting later does not put a second copy of anything into your books.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it connected</AlertDialogCancel>
            <AlertDialogAction onClick={disconnect}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// The settings come back typed; the inputs are text, so they are shown as text and sent
// back the same way.
const settingsToForm = (connection: AccountingConnection): Record<string, string> =>
  Object.fromEntries(connection.settingFields.map((field) => {
    const value = connection.settings[field];
    return [field, value === null || value === undefined ? "" : String(value)];
  }));

// A blank field clears that setting rather than storing an empty string.
const formToSettings = (form: Record<string, string>): Record<string, string | null> =>
  Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() === "" ? null : value.trim()]));
