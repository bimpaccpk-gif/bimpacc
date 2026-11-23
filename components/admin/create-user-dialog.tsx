"use client";

import type { OpenCourse } from "@/types";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateUserForm } from "./create-user-form";
import { BulkUserForm } from "./bulk-user-form";
import { UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<OpenCourse[]>([]);

  useEffect(() => {
    if (open) {
      const fetchCourses = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("courses")
          .select("id, title, batch")
          .eq("registration_open", true)
          .order("created_at", { ascending: false });
        setCourses(data || []);
      };
      fetchCourses();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants()}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Create User
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Add new user(s) to the platform
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Single User
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Bulk Users
              </TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-4">
              <CreateUserForm onSuccess={() => setOpen(false)} courses={courses} />
            </TabsContent>
            <TabsContent value="bulk" className="mt-4">
              <BulkUserForm onSuccess={() => setOpen(false)} courses={courses} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
