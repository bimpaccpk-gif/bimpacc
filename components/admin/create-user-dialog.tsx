"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateUserForm } from "./create-user-form";
import { UserPlus } from "lucide-react";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants()}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Create User
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Add a new user to the platform
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CreateUserForm onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
