import Link from "next/link";
import AddTechnicianForm from "./AddTechnicianForm";

export default function AddTechnicianPage() {
  return (
    <main className="form-page-shell">
      <section className="form-page-card">
        <div className="form-page-header">
          <div>
            <p className="eyebrow">FlowOps Team Management</p>
            <h1>Add Technician</h1>
            <p>
              Add a technician to the shop roster and dispatch board.
            </p>
          </div>

          <Link
            className="secondary-button button-link"
            href="/technicians"
          >
            Back to Technicians
          </Link>
        </div>

        <AddTechnicianForm />
      </section>
    </main>
  );
}