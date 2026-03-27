"use client";

import { useState, useActionState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UploadCloud, FileType, CheckCircle2, AlertCircle } from "lucide-react";

export function OnboardingModal({ user }: { user: any }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  
  // File upload states
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
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const uploadAllFiles = async () => {
    if (!cnicFile || !degreeFile || !receiptFile || !avatarFile) {
      alert("Please upload all 4 required files before submitting.");
      return false;
    }
    
    setIsUploading(true);
    try {
      setUploadProgress(10);
      const cPath = await handleFileUpload(cnicFile, 'cnic');
      setCnicPath(cPath);
      
      setUploadProgress(40);
      const dPath = await handleFileUpload(degreeFile, 'degree');
      setDegreePath(dPath);
      
      setUploadProgress(70);
      const rPath = await handleFileUpload(receiptFile, 'receipt');
      setReceiptPath(rPath);
      
      setUploadProgress(90);
      const aPath = await handleFileUpload(avatarFile, 'avatar');
      setAvatarPath(aPath);
      
      setUploadProgress(100);
      return true;
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload files: " + err.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    // Intercept standard submission to upload files first
    if (!cnicPath || !degreePath || !receiptPath || !avatarPath) {
      const success = await uploadAllFiles();
      if (!success) return; // Cancel if uploads failed
    }
    
    // Inject the final paths back into formData for the server action
    // State isn't instantly available in formData, so we'll append standard state tracking 
    // BUT actually formData won't have cnicPath right after setCnicPath unless we append explicitly:
  };

  // Better approach: wrap form action
  const formActionWrapper = async (formData: FormData) => {
    let cp = cnicPath, dp = degreePath, rp = receiptPath, ap = avatarPath;
    
    if (!cp || !dp || !rp || !ap) {
      if (!cnicFile || !degreeFile || !receiptFile || !avatarFile) {
        alert("Please select all 4 required files first.");
        return;
      }
      
      setIsUploading(true);
      try {
        cp = await handleFileUpload(cnicFile, 'cnic');
        dp = await handleFileUpload(degreeFile, 'degree');
        rp = await handleFileUpload(receiptFile, 'receipt');
        ap = await handleFileUpload(avatarFile, 'avatar');
        setCnicPath(cp); setDegreePath(dp); setReceiptPath(rp); setAvatarPath(ap);
      } catch(e: any) {
        setIsUploading(false);
        alert(e.message);
        return;
      }
      setIsUploading(false);
    }

    formData.append("cnic_file_path", cp);
    formData.append("degree_file_path", dp);
    formData.append("fee_receipt_file_path", rp);
    formData.append("avatar_file_path", ap);
    
    action(formData); // Call server action
  };

  // We explicitly block scrolling on body when this mounts
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  if (state?.success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl">
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 animate-bounce" />
          <h2 className="text-2xl font-bold">Profile Setup Complete!</h2>
          <p className="text-muted-foreground">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 lg:p-8">
      <div className="flex w-full max-w-6xl h-full max-h-[900px] flex-col lg:flex-row bg-background rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border">
        
        {/* Left Panel - Static Info */}
        <div className="lg:w-2/5 p-8 lg:p-12 bg-indigo-50/50 dark:bg-indigo-950/20 border-r border-border/50 overflow-y-auto hidden lg:block">
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Welcome to BIMPACC</h2>
              <p className="mt-2 text-muted-foreground">Please complete your profile to access your dashboard.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-indigo-600 dark:text-indigo-400">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold text-foreground/80">Bank Name:</span> United Bank Limited (UBL)</p>
                <p><span className="font-semibold text-foreground/80">Account Title:</span> BIMPACC</p>
                <p><span className="font-semibold text-foreground/80">Account Number:</span> 0271343859053</p>
                <p><span className="font-semibold text-foreground/80">IBAN:</span> PK94UNIL0109000343859053</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg">Certifications</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                <span className="font-bold">Eligibility:</span> Only your keen interest<br/>
                <span className="font-bold">Certificate:</span> Assessment based<br/>
                <span className="font-bold">Authorities:</span> BIMPACC 🇵🇰, Skill Development Council Canada 🇨🇦 & CPD UK 🇬🇧
              </p>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="font-bold block mb-2">Note:</span>
                After Qualifying and receiving a Certificate from us (BIMPACC), you will be able to receive additional certificates (optional):<br/>
                • Skill Development Council Canada (3,500 PKR)<br/>
                • CPD UK (4,000 PKR)
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
               <h3 className="font-bold">Let's Connect</h3>
               <ul className="text-sm space-y-2 text-indigo-600 dark:text-indigo-400">
                  <li><a href="https://whatsapp.com/channel/0029Vb3iNAvCcW4rqotpiw01" target="_blank" className="hover:underline">WhatsApp Channel</a></li>
                  <li><a href="https://www.youtube.com/BIMPakPK" target="_blank" className="hover:underline">YouTube (BIMPakPK)</a></li>
                  <li><a href="https://www.linkedin.com/company/bimpak/" target="_blank" className="hover:underline">LinkedIn</a></li>
                  <li><a href="https://www.facebook.com/bimpakpk/" target="_blank" className="hover:underline">Facebook</a></li>
                  <li><a href="https://chat.whatsapp.com/D68NUUVkLqr6r3M3HxR1Da" target="_blank" className="hover:underline">WhatsApp Group</a></li>
               </ul>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 p-6 lg:p-12 overflow-y-auto bg-background">
          <form action={formActionWrapper} className="w-full max-w-2xl mx-auto space-y-8">
            <div className="lg:hidden p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 mb-6 text-sm">
               Please scroll and complete all mandatory fields to unlock your account. Check the sidebar on Desktop for payment instructions.
            </div>

            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* Profile Info Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold border-b pb-2">1. Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Father Name *</Label>
                  <Input name="father_name" required className="uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input type="date" name="dob" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CNIC/Passport Document (Max 10MB) *</Label>
                <Input type="file" required accept=".pdf,image/*" onChange={e => setCnicFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Student Picture (Passport Size) *</Label>
                <Input type="file" required accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            {/* Education Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold border-b pb-2 pt-4">2. Academic Background</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Education Level *</Label>
                  <select name="education_level" required className="w-full h-10 px-3 rounded-md border flex">
                    <option value="" disabled selected>Select level...</option>
                    <option value="Graduation (16 Years)">Graduation (16 Years)</option>
                    <option value="MS (17/18 Years)">MS (17/18 Years)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Degree Title *</Label>
                  <Input name="degree_title" placeholder="e.g. BSc Civil Engg" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Profession *</Label>
                  <Input name="profession" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Last Degree/Certificate Document (Max 10MB) *</Label>
                <Input type="file" required accept=".pdf,image/*" onChange={e => setDegreeFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold border-b pb-2 pt-4">3. Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contact Number (WhatsApp) *</Label>
                  <Input name="whatsapp_number" type="tel" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Postal Address *</Label>
                <Input name="postal_address" required />
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold border-b pb-2 pt-4">4. Fee Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Fee Challan No / Transaction ID & Bank *</Label>
                  <Input name="fee_transaction_id" required />
                </div>
                <div className="space-y-2">
                  <Label>Fee Submission Date *</Label>
                  <Input type="date" name="fee_submission_date" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fee Receipt / Screenshot (Max 10MB) *</Label>
                <Input type="file" required accept=".pdf,image/*" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            {/* Declaration */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold border-b pb-2 pt-4">5. Declaration</h3>
              <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-xl border border-border">
                <input type="checkbox" id="declare" name="declaration_accepted" required className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                <Label htmlFor="declare" className="text-sm font-medium leading-relaxed">
                  I understand that information provided in this form is correct and accurate to the best of my knowledge. I further understand that the name I provided will be printed on the certificate.
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold shadow-lg"
              disabled={pending || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading Files... Please wait
                </>
              ) : pending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                "Submit & Unlock Dashboard"
              )}
            </Button>
            
          </form>
        </div>
      </div>
    </div>
  );
}
