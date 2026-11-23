"use client";

import type { StudentProfileFields } from "@/types";
import { useActionState, useEffect } from "react";
import { completeOnboarding } from "@/app/actions/student";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Lock, BookOpen, LogOut } from "lucide-react";

export function OnboardingModal({
  user,
  selectedCourse,
}: {
  user: StudentProfileFields;
  selectedCourse: { title: string; batch?: string | null } | null;
}) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  const formActionWrapper = async (formData: FormData) => {
    action(formData);
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
          <CheckCircle2 className="mx-auto h-16 w-16 text-success animate-bounce" />
          <h2 className="text-2xl font-bold">Profile Setup Complete!</h2>
          <p className="text-muted-foreground">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6 lg:p-8">
      <div className="flex w-full max-w-6xl h-full max-h-[900px] flex-col lg:flex-row bg-background rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border">
        
        {/* Left Panel - Static Info */}
        <div className="lg:w-2/5 p-8 lg:p-12 bg-primary/5 dark:bg-primary/10 border-r border-border/50 overflow-y-auto hidden lg:block">
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Welcome to BIMPACC</h2>
                <p className="mt-2 text-muted-foreground">Please complete your profile to access your dashboard.</p>
              </div>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>

            <div className="p-6 rounded-2xl bg-card dark:bg-card border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-primary dark:text-primary">Payment Details</h3>
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
              <div className="p-4 rounded-xl bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning text-sm text-warning dark:text-warning leading-relaxed">
                <span className="font-bold block mb-2">Note:</span>
                After Qualifying and receiving a Certificate from us (BIMPACC), you will be able to receive additional certificates (optional):<br/>
                • Skill Development Council Canada (3,500 PKR)<br/>
                • CPD UK (4,000 PKR)
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
               <h3 className="font-bold">Let&apos;s Connect</h3>
               <ul className="text-sm space-y-2 text-primary dark:text-primary">
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
            <div className="lg:hidden flex items-center justify-between p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning mb-6 text-sm">
              <span>Please scroll and complete all mandatory fields to unlock your account.</span>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm" className="text-warning hover:text-warning hover:bg-warning/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <span className="text-sm font-medium text-foreground">Personal Info</span>
              </div>
              <div className="h-px w-8 bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-foreground">Academic</span>
              </div>
              <div className="h-px w-8 bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <span className="text-sm font-medium text-foreground">Contact</span>
              </div>
              <div className="h-px w-8 bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  4
                </div>
                <span className="text-sm font-medium text-foreground">Payment</span>
              </div>
              <div className="h-px w-8 bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  5
                </div>
                <span className="text-sm font-medium text-foreground">Declaration</span>
              </div>
            </div>

            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* Account Info Section (Read-Only) */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold border-b pb-2 flex-1">Your Account</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Auto-filled
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Full Name</Label>
                  <Input
                    value={user.full_name}
                    disabled
                    className="bg-muted/50 text-foreground font-medium cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email Address</Label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-muted/50 text-foreground font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Selected Course Section (Read-Only) */}
            {selectedCourse && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold border-b pb-2 flex-1">Selected Course</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Not changeable
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary dark:text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedCourse.title}</p>
                      {selectedCourse.batch && (
                        <p className="text-sm text-muted-foreground">Batch: {selectedCourse.batch}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>CNIC / Passport Number *</Label>
                  <Input name="cnic_number" required />
                </div>
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
                  <Label>Fee Challan No / Transaction ID *</Label>
                  <Input name="fee_transaction_id" required />
                </div>
                <div className="space-y-2">
                  <Label>Fee Submission Date *</Label>
                  <Input type="date" name="fee_submission_date" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input name="bank_name" required />
                </div>
              </div>
            </div>

            {/* Declaration */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold border-b pb-2 pt-4">5. Declaration</h3>
              <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-xl border border-border">
                  <input type="checkbox" id="declare" name="declaration_accepted" required aria-label="Accept declaration" className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                <Label htmlFor="declare" className="text-sm font-medium leading-relaxed">
                  I understand that information provided in this form is correct and accurate to the best of my knowledge. I further understand that the name I provided will be printed on the certificate.
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold shadow-lg"
              disabled={pending}
            >
              {pending ? (
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
