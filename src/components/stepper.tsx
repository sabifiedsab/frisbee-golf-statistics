"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface StepperProps {
  value: number;
  min?: number;
  onChange: (value: number) => void;
  size?: "sm" | "lg";
}

export function Stepper({ value, min = 0, onChange, size = "sm" }: StepperProps) {
  const btnSize = size === "lg" ? "icon-lg" : "icon-sm";

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" />
      </Button>
      <span className={`tabular-nums font-semibold min-w-[2ch] text-center ${size === "lg" ? "text-2xl" : "text-base"}`}>
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
