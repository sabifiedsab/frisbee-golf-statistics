"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import {
  useFormContext,
  FormProvider,
  Controller,
  type UseFormReturn,
  type FieldError,
  type FieldValues,
  type FieldPath,
  type ControllerRenderProps,
  type RegisterOptions,
} from "react-hook-form"
import { cn } from "@/lib/utils"

const FormFieldContext = React.createContext<string>("")

export function Form<TFieldValues extends FieldValues = FieldValues>({
  children,
  ...props
}: { children: React.ReactNode } & UseFormReturn<TFieldValues>) {
  return (
    <FormProvider {...props}>
      {children}
    </FormProvider>
  )
}

export function FormField<TFieldValues extends FieldValues = FieldValues>({
  name,
  render,
  rules,
  defaultValue,
  shouldUnregister,
}: {
  name: FieldPath<TFieldValues>
  render: (props: { field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>> }) => React.ReactElement
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
  defaultValue?: TFieldValues[FieldPath<TFieldValues>]
  shouldUnregister?: boolean
}) {
  return (
    <FormFieldContext.Provider value={name}>
      <Controller
        name={name}
        control={useFormContext<TFieldValues>().control}
        rules={rules}
        defaultValue={defaultValue}
        shouldUnregister={shouldUnregister}
        render={({ field }) => render({ field })}
      />
    </FormFieldContext.Provider>
  )
}

function get(obj: Record<string, unknown> | undefined, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
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
} & React.HTMLAttributes<HTMLDivElement>) {
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
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & {
  ref?: React.Ref<HTMLInputElement>
}) {
  return (
    <Slot
      {...props}
      ref={ref}
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
  const fieldName = React.useContext(FormFieldContext)
  const { formState: { errors } } = useFormContext()
  const error = get(errors as unknown as Record<string, unknown>, fieldName) as FieldError | undefined
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
