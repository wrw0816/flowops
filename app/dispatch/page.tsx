const technicians = [
  {
    name: "Kevin",
    initials: "KW",
    status: "Working",
    currentRo: "RO 56321",
    vehicle: "2021 Ford F-150",
    operation: "Front brakes",
    elapsed: "1h 12m",
    nextRo: "RO 56346",
    nextVehicle: "2020 Honda Accord",
  },
  {
    name: "Cesar",
    initials: "CR",
    status: "Working",
    currentRo: "RO 56318",
    vehicle: "2019 Chevrolet Tahoe",
    operation: "Cooling system diagnosis",
    elapsed: "46m",
    nextRo: "RO 56339",
    nextVehicle: "2022 Toyota Camry",
  },
  {
    name: "Michael",
    initials: "MS",
    status: "Waiting",
    currentRo: "RO 56304",
    vehicle: "2018 Jeep Grand Cherokee",
    operation: "Waiting for approval",
    elapsed: "38m",
    nextRo: "Unassigned",
    nextVehicle: "Needs next assignment",
  },
  {
    name: "Mitch",
    initials: "MB",
    status: "Available",
    currentRo: "No active RO",
    vehicle: "Ready for dispatch",
    operation: "Available now",
    elapsed: "11m idle",
    nextRo: "RO 56328",
    nextVehicle: "2020 Ford Explorer",
  },
];

const queue = [
  {
    priority: "Urgent",
    ro: "56328",
    vehicle: "2020 Ford Explorer",
    service: "No-start diagnostic",
    advisor: "Logan",
    promised: "11:30 AM",
    waiting: "22 min",
    hours: "1.5",
  },
  {
    priority: "High",
    ro: "56331",
    vehicle: "2021 Honda Accord",
    service: "MPI and oil change",
    advisor: "Tristan",
    promised: "12:00 PM",
    waiting: "14 min",
    hours: "1.0",
  },
  {
    priority: "High",
    ro: "56340",
    vehicle: "2019 Chevrolet Tahoe",
    service: "Front brake replacement",
    advisor: "Logan",
    promised: "2:00 PM",
    waiting: "8 min",
    hours: "2.5",
  },
  {
    priority: "Normal",
    ro: "56344",
    vehicle: "2022 Toyota Camry",
    service: "Check-engine-light diagnosis",
    advisor: "Tristan",
    promised: "3:30 PM",
    waiting: "5 min",
    hours: "1.0",
  },
];

function technicianStatusClass(status: string) {
  if (status === "Working") return "dispatch-tech-status working";
  if (status === "Waiting") return "dispatch-tech-status waiting";
  return "dispatch-tech-status available";
}

export default function DispatchPage() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">F</div>
            <div>
              <div className="brand-name">FlowOps</div>
              <div className="brand-subtitle">Service Operations</div>
            </div>
          </div>

          <nav className="nav">
            <a className="nav-item" href="/">
              <span>▦</span>
              Command Center
            </a>

            <a className="nav-item" href="/dispatch">
  <span>⇄</span>
  Dispatch Board
</a>

            <a className="nav-item" href="#">
              <span>▤</span>
              Repair Orders
            </a>

            <a className="nav-item" href="#">
              <span>◷</span>
              Appointments
            </a>

            <a className="nav-item" href="#">
              <span>●</span>
              Technicians
            </a>

            <a className="nav-item" href="#">
              <span>▥</span>
              TV Mode
            </a>

            <a className="nav-item" href="#">
              <span>⌁</span>
              Analytics
            </a>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <a className="nav-item" href="#">
            <span>⚙</span>
            Shop Settings
          </a>

          <div className="shop-card">
            <div className="shop-icon">AA</div>
            <div>
              <div className="shop-name">Alderman Automotive</div>
              <div className="shop-location">Primary location</div>
            </div>
          </div>
        </div>
      </aside>

      <section className="content dispatch-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live Shop Flow</p>
            <h1>Dispatch Board</h1>
            <p className="page-description">
              Assign work, monitor technician flow and eliminate idle time.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="live-indicator">
              <span className="live-dot" />
              Live
            </div>

            <button className="secondary-button">TV Mode</button>
            <button className="primary-button">+ Add Repair Order</button>
          </div>
        </header>

        <section className="dispatch-summary">
          <article className="dispatch-summary-card">
            <span>Waiting Dispatch</span>
            <strong>4</strong>
            <small>8.0 labor hours</small>
          </article>

          <article className="dispatch-summary-card">
            <span>Technicians Working</span>
            <strong>2</strong>
            <small>50% active utilization</small>
          </article>

          <article className="dispatch-summary-card">
            <span>Available Now</span>
            <strong className="dispatch-red">1</strong>
            <small>Mitch idle for 11 minutes</small>
          </article>

          <article className="dispatch-summary-card">
            <span>At Risk</span>
            <strong className="dispatch-yellow">2</strong>
            <small>Approval or promised-time risk</small>
          </article>
        </section>

        <section className="dispatch-layout">
          <div className="dispatch-queue-panel">
            <div className="dispatch-section-header">
              <div>
                <h2>Ready for Dispatch</h2>
                <p>Prioritized repair orders waiting for assignment</p>
              </div>

              <div className="dispatch-filter-row">
                <button className="dispatch-filter active">All</button>
                <button className="dispatch-filter">Waiting</button>
                <button className="dispatch-filter">Customer Waiter</button>
                <button className="dispatch-filter">Parts Ready</button>
              </div>
            </div>

            <div className="dispatch-card-list">
              {queue.map((item) => (
                <article className="dispatch-ro-card" key={item.ro}>
                  <div className="dispatch-card-top">
                    <div className="dispatch-card-heading">
                      <span
                        className={`priority priority-${item.priority.toLowerCase()}`}
                      >
                        {item.priority}
                      </span>

                      <div>
                        <strong>RO {item.ro}</strong>
                        <span>{item.vehicle}</span>
                      </div>
                    </div>

                    <span className="dispatch-wait-time">
                      Waiting {item.waiting}
                    </span>
                  </div>

                  <div className="dispatch-service-name">
                    {item.service}
                  </div>

                  <div className="dispatch-card-details">
                    <div>
                      <span>Advisor</span>
                      <strong>{item.advisor}</strong>
                    </div>

                    <div>
                      <span>Promised</span>
                      <strong>{item.promised}</strong>
                    </div>

                    <div>
                      <span>Labor</span>
                      <strong>{item.hours} hrs</strong>
                    </div>
                  </div>

                  <div className="dispatch-card-actions">
                    <select defaultValue="">
                      <option value="" disabled>
                        Select technician
                      </option>
                      <option>Kevin</option>
                      <option>Cesar</option>
                      <option>Michael</option>
                      <option>Mitch</option>
                    </select>

                    <button className="dispatch-assign-button">
                      Assign RO
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="dispatch-technician-panel">
            <div className="dispatch-section-header">
              <div>
                <h2>Technician Workload</h2>
                <p>Current and next assignments</p>
              </div>
            </div>

            <div className="dispatch-technician-list">
              {technicians.map((technician) => (
                <article
                  className="dispatch-technician-card"
                  key={technician.name}
                >
                  <div className="dispatch-tech-header">
                    <div className="dispatch-tech-identity">
                      <div className="avatar">{technician.initials}</div>

                      <div>
                        <strong>{technician.name}</strong>
                        <div
                          className={technicianStatusClass(
                            technician.status,
                          )}
                        >
                          <span />
                          {technician.status}
                        </div>
                      </div>
                    </div>

                    <button className="row-action">•••</button>
                  </div>

                  <div className="dispatch-current-job">
                    <span className="dispatch-card-label">
                      Current Assignment
                    </span>

                    <strong>{technician.currentRo}</strong>
                    <span>{technician.vehicle}</span>
                    <small>{technician.operation}</small>

                    <div className="dispatch-job-timer">
                      <span>Time in status</span>
                      <strong>{technician.elapsed}</strong>
                    </div>
                  </div>

                  <div className="dispatch-next-job">
                    <span className="dispatch-card-label">
                      Next Assignment
                    </span>

                    <strong>{technician.nextRo}</strong>
                    <span>{technician.nextVehicle}</span>
                  </div>

                  <button className="dispatch-manage-button">
                    Manage Technician
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}