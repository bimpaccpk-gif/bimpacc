import "server-only";

import { cache } from "react";

import {
  SERVICE_BILLING_SETTINGS_COLUMNS,
  type ServiceBillingSettings,
} from "@/lib/billing-policy";
import { createClient } from "@/lib/supabase/server";

export const getServiceBillingSettings = cache(
  async (): Promise<ServiceBillingSettings | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("service_billing_settings")
      .select(SERVICE_BILLING_SETTINGS_COLUMNS)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Unable to read service billing settings", error.message);
      return null;
    }

    return data as ServiceBillingSettings | null;
  }
);
