"use client";

import { useState, useActionState } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeBypassedProfile } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

export function ProfileCompletionForm({ user }: { user: any }) {
  const [state, action, pending] = useActionState(completeBypassedProfile, undefined);
  
  // File upload states (all optional)
  const [cnicFile, setCnicFile] = useState<File | null>(null);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Uploaded paths
  const [cnicPath, setCnicPath] = useState("");
  const [degreePath, setDegreePath] = useState("");
  const [receiptPath, setReceiptPath] = useState("");
  const [avatarPath, setAvatarPath] = useState("");

  const [isUploading, setIsUploading] = useState(false);

  const supabase = createClient();

  const handleFileUpload = async (file: File, type: string) => {
    const fileExt = file.name.split('.').pop();
    const filename = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${filename}`;

    const { data, error } = await supabase.storage
      .from('student_documents')
      .upload(filePath, file, { upsert: true });

    if (error) throw error;
    return data.path;
  };

  const formActionWrapper = async (formData: FormData) => {
    let cp = cnicPath, dp = degreePath, rp = receiptPath, ap = avatarPath;
    
    // Upload files only if selected (all optional)
    setIsUploading(true);
    try {
      if (cnicFile && !cp) {
        cp = await handleFileUpload(cnicFile, 'cnic');
        setCnicPath(cp);
      }
      if (degreeFile && !dp) {
        dp = await handleFileUpload(degreeFile, 'degree');
        setDegreePath(dp);
      }
      if (receiptFile && !rp) {
        rp = await handleFileUpload(receiptFile, 'receipt');
        setReceiptPath(rp);
      }
      if (avatarFile && !ap) {
        ap = await handleFileUpload(avatarFile, 'avatar');
        setAvatarPath(ap);
      }
    } catch(e: any) {
      setIsUploading(false);
      alert(e.message);
      return;
    }
    setIsUploading(false);

    // Append file paths if they exist
    if (cp) formData.append("cnic_file_path", cp);
    if (dp) formData.append("degree_file_path", dp);
    if (rp) formData.append("fee_receipt_file_path", rp);
    if (ap) formData.append("avatar_file_path", ap);
    
    action(formData);
  };

  if (state?.success) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {state.success}
        </p>
      </div>
    );
  }

  return (
    <form action={formActionWrapper} className="space-y-8">
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
        <div className="space-y-2">
          <Label>CNIC/Passport Document (Optional)</Label>
          <Input 
            type="file" 
            accept=".pdf,image/*" 
            onChange={e => setCnicFile(e.target.files?.[0] || null)} 
          />
          {user.cnic_file_path && (
            <p className="text-xs text-muted-foreground">Document already uploaded</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Student Picture (Optional)</Label>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={e => setAvatarFile(e.target.files?.[0] || null)} 
          />
          {user.avatar_file_path && (
            <p className="text-xs text-muted-foreground">Picture already uploaded</p>
          )}
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
        <div className="space-y-2">
          <Label>Last Degree/Certificate Document (Optional)</Label>
          <Input 
            type="file" 
            accept=".pdf,image/*" 
            onChange={e => setDegreeFile(e.target.files?.[0] || null)} 
          />
          {user.degree_file_path && (
            <p className="text-xs text-muted-foreground">Document already uploaded</p>
          )}
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
            <Label>Fee Challan No / Transaction ID & Bank</Label>
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
        <div className="space-y-2">
          <Label>Fee Receipt / Screenshot (Optional)</Label>
          <Input 
            type="file" 
            accept=".pdf,image/*" 
            onChange={e => setReceiptFile(e.target.files?.[0] || null)} 
          />
          {user.fee_receipt_file_path && (
            <p className="text-xs text-muted-foreground">Receipt already uploaded</p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold"
        disabled={pending || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading Files...
          </>
        ) : pending ? (
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
