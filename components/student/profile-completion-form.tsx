"use client";

import type { StudentProfileFields } from "@/types";
import { useActionState } from "react";
import { completeBypassedProfile } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function ProfileCompletionForm({ user }: { user: StudentProfileFields }) {
  const [state, action, pending] = useActionState(completeBypassedProfile, undefined);

  if (state?.success) {
    return (
      <div className="flex items-center gap-3 p-4 bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success rounded-xl">
        <CheckCircle2 className="h-5 w-5 text-success dark:text-success" />
        <p className="text-sm font-medium text-success dark:text-success">
          {state.success}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Personal Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold border-b pb-2">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Father Name</Label>
            <Input
              name="father_name"
              defaultValue={user.father_name || ""}
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              name="dob"
              defaultValue={user.dob || ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>CNIC / Passport Number</Label>
            <Input
              name="cnic_number"
              defaultValue={user.cnic_number || ""}
            />
          </div>
        </div>
      </div>

      {/* Academic Background */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold border-b pb-2 pt-4">Academic Background</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Education Level</Label>
            <select 
              name="education_level" 
              defaultValue={user.education_level || ""}
              className="w-full h-10 px-3 rounded-md border flex"
            >
              <option value="">Select level...</option>
              <option value="Graduation (16 Years)">Graduation (16 Years)</option>
              <option value="MS (17/18 Years)">MS (17/18 Years)</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Degree Title</Label>
            <Input 
              name="degree_title" 
              placeholder="e.g. BSc Civil Engg" 
              defaultValue={user.degree_title || ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Profession</Label>
            <Input 
              name="profession" 
              defaultValue={user.profession || ""}
            />
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold border-b pb-2 pt-4">Contact Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Contact Number (WhatsApp)</Label>
            <Input 
              name="whatsapp_number" 
              type="tel" 
              defaultValue={user.whatsapp_number || ""}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Postal Address</Label>
          <Input 
            name="postal_address" 
            defaultValue={user.postal_address || ""}
          />
        </div>
      </div>

      {/* Fee Verification */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold border-b pb-2 pt-4">Fee Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Fee Challan No / Transaction ID</Label>
            <Input
              name="fee_transaction_id"
              defaultValue={user.fee_transaction_id || ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Fee Submission Date</Label>
            <Input
              type="date"
              name="fee_submission_date"
              defaultValue={user.fee_submission_date || ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              name="bank_name"
              defaultValue={user.bank_name || ""}
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving Profile...
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  );
}
