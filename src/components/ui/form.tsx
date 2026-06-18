"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { useFormContext, FormProvider, Controller } from "react-hook-form"
import { cn } from "@/lib/utils"

export function Form({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  return (
    <FormProvider {...props}>
      {children}
    </FormProvider>
  )
}

export function FormField({
  name,
  render,
  rules,
  defaultValue,
  shouldUnregister,
}: {
  name: any
  render: (props: { field: any }) => React.ReactNode
  rules?: any
  defaultValue?: any
  shouldUnregister?: boolean
}) {
  return (
    <Controller
      name={name}
      control={useFormContext().control}
      rules={rules}
      defaultValue={defaultValue}
      shouldUnregister={shouldUnregister}
      render={({ field }) => render({ field })}
    />
  )
}

export function FormItem({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>
}

export function FormLabel({
  className,
  children,
  ...props
}: {
  className?: string
  children: React.ReactNode
} & React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <div
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function FormControl({
  onChange,
  onBlur,
  name,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & {
  onChange?: (value: any) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  name?: string
  ref?: React.Ref<HTMLInputElement>
}) {
  return (
    <Slot
      {...props}
      ref={ref}
      onChange={onChange}
      onBlur={onBlur}
      name={name}
    />
  )
}

export function FormDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export function FormMessage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { formState: { error } } = useFormContext()
  return (
    <span
      className={cn(
        "text-[0.8rem] font-medium text-destructive",
        className
      )}
      {...props}
    >
      {error ? error.message : null}
    </span>
  )
}