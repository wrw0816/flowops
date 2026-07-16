import Link from "next/link";
import AddRepairOrderForm from "./AddRepairOrderForm";

export default function NewRepairOrderPage() {
  return (
    <main className="form-page-shell">
      <section className="form-page-card">
        <div className="form-page-header">
          <div>
            <p className="eyebrow">FlowOps Dispatch</p>
            <h1>Add Repair Order</h1>
            <p>
              Create a new repair order and place it into the dispatch queue.
            </p>
          </div>

          <Link
            className="secondary-button button-link"
            href="/dispatch"
          >
            Back to Dispatch
          </Link>
        </div>

        <AddRepairOrderForm />
      </section>
    </main>
  );
}