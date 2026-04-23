"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/helper/show-toast";

interface TopUpTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: "bni", label: "BNI  ****6612" },
  { value: "bri", label: "BRI  ****1284" },
  { value: "gopay", label: "GoPay" },
];

export function TopUpTokenDialog({
  isOpen,
  onClose,
}: TopUpTokenDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);

  const handleClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleContinue = () => {
    showToast("info", "Top up is still a dummy flow on this page.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="">
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-3xl font-bold">Top Up Token</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-8 py-10">
          <div className="space-y-3">
            <label className="text-lg font-semibold text-foreground">
              Amount to add
            </label>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="50.000"
              className="h-14 rounded-2xl border-border px-5 text-lg"
            />
            <p className="text-sm text-muted-foreground">
              Enter an amount between 50.000 and 10.000.000
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-lg font-semibold text-foreground">
              Payment method
            </label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-14 rounded-2xl border-border px-5 text-left text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooterWithButton
          buttonMessage="Continue"
          onClick={handleContinue}
          className="border-t px-8 py-6"
        />
      </DialogContent>
    </Dialog>
  );
}
