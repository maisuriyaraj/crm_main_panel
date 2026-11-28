"use client";

import { ArrowRight } from "lucide-react";

import type { ProductErrorTarget } from "@/lib/products/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The 409 SKU_ALREADY_EXISTS warning (SRS 7.8).
//
// There is no "add it anyway", because a code that names two things is not a
// code: the API has no override. The one way forward is to look at the item that
// already holds the code, so that is the one action offered — and the form stays
// open behind this, so nothing typed is lost.
//
// The clash holds against an **inactive** item too, which is the part that
// confuses people (the code looks free because the item is not in the list), so
// an inactive match says so plainly.
export function ProductSkuConflictDialog({
  product,
  open,
  onOpenChange,
  onOpenProduct,
}: {
  product: ProductErrorTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Opens the item that holds the code, so its code can be changed or it can be
  // edited instead of adding a second record for the same thing.
  onOpenProduct: (product: ProductErrorTarget) => void;
}) {
  const inactive = product?.status === "inactive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>That item code is already in use</DialogTitle>
          <DialogDescription>
            An item code has to point at one thing, so this item wasn&apos;t saved.
            {inactive
              ? " The item holding it is inactive, which is why you may not see it in your list — an inactive item keeps its code, because your own records still refer to it by that code."
              : " Give this one a different code, or edit the item that already has it."}
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <p className="font-medium">{product.name}</p>
              <Badge variant={inactive ? "outline" : "secondary"}>{inactive ? "Inactive" : "Active"}</Badge>
            </div>
            {product.sku && <p className="text-muted-foreground">Code: {product.sku}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          {product && (
            <Button onClick={() => onOpenProduct(product)}>
              Edit {product.name} <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
