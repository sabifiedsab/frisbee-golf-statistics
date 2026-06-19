"use client"

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Stepper } from "@/components/stepper";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Course name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  holes: z.array(
    z.object({
      number: z.number().int().positive("Must be positive"),
      par: z.number().int().positive("Must be positive"),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddCoursePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [batchCount, setBatchCount] = useState(9);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      holes: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "holes",
  });

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && !session?.user?.isAdmin) {
      toast.error("Admin access required");
      router.replace("/");
    }
  }, [status, session, router]);

  function addBatch(count: number) {
    const startNumber = fields.length + 1;
    const newHoles = Array.from({ length: count }, (_, i) => ({
      number: startNumber + i,
      par: 3,
    }));
    append(newHoles);
  }

  function renumber() {
    fields.forEach((_, i) => {
      update(i, { ...form.getValues(`holes.${i}`), number: i + 1 });
    });
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create course");
      }
      toast.success("Course created successfully!");
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (status !== "authenticated" || !session?.user?.isAdmin) {
    return <div className="container mx-auto py-10 text-center">Checking access...</div>;
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Course</CardTitle>
              <CardDescription>Enter the details of the frisbee golf course.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Pine Valley Park" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Springfield, IL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Course"}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Holes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addBatch(9)}>
                  Add 9
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addBatch(18)}>
                  Add 18
                </Button>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, Number(e.target.value)))}
                    className="w-16 h-8"
                    aria-label="Custom hole count"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addBatch(batchCount)}>
                    Add
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => append({ number: fields.length + 1, par: 3 })}>
                  <PlusCircle className="mr-1 h-4 w-4" /> Single
                </Button>
              </div>
            </div>

            {fields.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                No holes yet. Use the buttons above to add holes.
              </p>
            ) : (
              <>
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-bold text-lg min-w-[3rem]">#{index + 1}</span>
                        <div className="flex-1">
                          <FormField
                            name={`holes.${index}.number` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hole #</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <FormField
                          name={`holes.${index}.par` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Par</FormLabel>
                              <FormControl>
                                <Stepper value={field.value} min={1} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          remove(index);
                          setTimeout(renumber, 0);
                        }}
                        disabled={fields.length <= 1}
                        className="self-end"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => router.push("/")} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || fields.length === 0}>
              {isLoading ? "Creating..." : "Save & Create Course"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
