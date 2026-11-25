"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToCreateTaxRate,
  reqToDeleteTaxRate,
  reqToGetTaxRates,
  reqToUpdateTaxRate,
  type TaxRate,
} from "@/lib/store/slices/billingSettingsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Rates are stored in basis points so nothing has to round a percentage: 18% is 1800.
const toBasisPoints = (percent: string) => Math.round(Number(percent) * 100);

export function TaxRatesTab({ canManage }: { canManage: boolean }) {
  const dispatch = useAppDispatch();
  const { taxRates, isSaving } = useAppSelector((state) => state.billingSettings);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("18");
  const [removing, setRemoving] = useState<TaxRate | null>(null);

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setName("");
    setPercent("18");
    setError(null);
  };

  const openEdit = (rate: TaxRate) => {
    setIsNew(false);
    setEditing(rate);
    setName(rate.name);
    setPercent(String(rate.ratePercent));
    setError(null);
  };

  const close = () => {
    setIsNew(false);
    setEditing(null);
  };

  const fail = (failure: unknown, fallback: string) => setError(apiErrorMessage(failure, fallback));

  const save = async () => {
    setError(null);
    const values = { name: name.trim(), rate_bp: toBasisPoints(percent) };

    if (isNew) {
      const action = await dispatch(reqToCreateTaxRate({
        data: values,
        onFailure: (failure) => fail(failure, "Couldn't add that tax rate."),
      }));
      if (reqToCreateTaxRate.fulfilled.match(action)) {
        notify("Tax rate added.", { type: "success" });
        // The first rate becomes the default on the server, so the list is re-read
        // rather than guessed at.
        dispatch(reqToGetTaxRates({ data: null }));
        close();
      }
      return;
    }

    if (!editing) return;
    const action = await dispatch(reqToUpdateTaxRate({
      data: { id: editing.id, values },
      onFailure: (failure) => fail(failure, "Couldn't save that tax rate."),
    }));
    if (reqToUpdateTaxRate.fulfilled.match(action)) {
      notify("Tax rate saved.", { type: "success" });
      close();
    }
  };

  const setDefault = async (rate: TaxRate) => {
    setError(null);
    const action = await dispatch(reqToUpdateTaxRate({
      data: { id: rate.id, values: { is_default: true } },
      onFailure: (failure) => fail(failure, "Couldn't make that the default rate."),
    }));
    if (reqToUpdateTaxRate.fulfilled.match(action)) {
      notify(`${rate.name} is now your default rate.`, { type: "success" });
      // Setting one default clears the others, so every row is re-read.
      dispatch(reqToGetTaxRates({ data: null }));
    }
  };

  const toggleActive = async (rate: TaxRate) => {
    setError(null);
    const action = await dispatch(reqToUpdateTaxRate({
      data: { id: rate.id, values: { active: !rate.active } },
      onFailure: (failure) => fail(failure, "Couldn't change that tax rate."),
    }));
    if (reqToUpdateTaxRate.fulfilled.match(action)) {
      notify(rate.active ? `${rate.name} turned off.` : `${rate.name} turned on.`, { type: "success" });
    }
  };

  const remove = async () => {
    if (!removing) return;
    setError(null);
    const action = await dispatch(reqToDeleteTaxRate({
      data: { id: removing.id },
      onFailure: (failure) => fail(failure, "Couldn't remove that tax rate."),
    }));
    if (reqToDeleteTaxRate.fulfilled.match(action)) {
      notify("Tax rate removed.", { type: "success" });
    }
    setRemoving(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t do that</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>Tax rates</CardTitle>
            <CardDescription>
              The rates you will be able to put on an invoice line. The default one is suggested first. Check the
              rates themselves with your accountant.
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden /> Add a rate
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {taxRates.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No tax rates yet.{canManage ? " Add the rates your business charges, such as GST 18%." : ""}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {rate.name}
                        {rate.isDefault && <Badge variant="secondary">Default</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>{rate.ratePercent}%</TableCell>
                    <TableCell>
                      {rate.active ? <Badge variant="outline">In use</Badge> : <Badge variant="outline">Turned off</Badge>}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <span className="flex flex-wrap justify-end gap-2">
                          {!rate.isDefault && rate.active && (
                            <Button variant="outline" size="sm" disabled={isSaving} onClick={() => setDefault(rate)}>
                              <Star className="size-4" aria-hidden />
                              <span className="sr-only sm:not-sr-only">Make default</span>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" disabled={isSaving} onClick={() => toggleActive(rate)}>
                            <Check className="size-4" aria-hidden />
                            <span className="sr-only sm:not-sr-only">{rate.active ? "Turn off" : "Turn on"}</span>
                          </Button>
                          <Button variant="outline" size="sm" disabled={isSaving} onClick={() => openEdit(rate)}>
                            <Pencil className="size-4" aria-hidden />
                            <span className="sr-only sm:not-sr-only">Edit</span>
                          </Button>
                          <Button variant="outline" size="sm" disabled={isSaving} onClick={() => setRemoving(rate)}>
                            <Trash2 className="size-4" aria-hidden />
                            <span className="sr-only sm:not-sr-only">Remove</span>
                          </Button>
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNew || !!editing} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add a tax rate" : "Edit tax rate"}</DialogTitle>
            <DialogDescription>
              Give it the name your clients will see on the invoice, and the percentage it charges.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate-name">Name</Label>
              <Input id="tax-rate-name" value={name} placeholder="GST 18%" onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-rate-percent">Rate (%)</Label>
              <Input
                id="tax-rate-percent"
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">Up to 50%. Two decimal places, for example 18 or 12.5.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isSaving}>Cancel</Button>
            <Button onClick={save} disabled={isSaving || name.trim() === ""}>
              {isSaving ? "Saving…" : isNew ? "Add rate" : "Save rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be offered on an invoice. If you may need it again, turn it off instead of removing it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
