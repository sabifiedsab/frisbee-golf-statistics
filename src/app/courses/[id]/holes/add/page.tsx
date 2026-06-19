"use client"

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  number: z.number().int().positive("Hole number must be a positive integer"),
  par: z.number().int().positive("Par must be a positive integer"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddHolePage() {
  const { id } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: 1,
      par: 3,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
        const response = await fetch("/api/holes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...values, courseId: id as string }),
        });

      if (!response.ok) throw new Error("Failed to add hole");

      toast.success("Hole added successfully!");
      router.push(`/courses/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Add Hole</CardTitle>
          <CardDescription>Add a new hole to this course.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hole Number</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="par"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Par</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading} onClick={form.handleSubmit(onSubmit)}>
                {isLoading ? "Adding..." : "Add Hole"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => router.push(`/courses/${id}`)} disabled={isLoading}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
