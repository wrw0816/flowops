import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddAppointmentForm from "./AddAppointmentForm";

type Technician = {
  id: string;
  name: string;
};

export default async function AddAppointmentPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("active", true)
    .neq("status", "off")
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to load technicians: ${error.message}`,
    );
  }

  const technicians = (data ?? []) as Technician[];

  return (
    <main className="form-page-shell">
      <section className="form-page-card">
        <div className="form-page-header">
          <div>
            <p className="eyebrow">FlowOps Scheduling</p>
            <h1>Add Appointment</h1>

            <p>
              Schedule an upcoming visit and make it visible to the
              service team.
            </p>
          </div>

          <Link
            className="secondary-button button-link"
            href="/appointments"
          >
            Back to Appointments
          </Link>
        </div>

        <AddAppointmentForm technicians={technicians} />
      </section>
    </main>
  );
}