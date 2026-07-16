const technicians = [
  {
    name: "Kevin",
    initials: "KW",
    status: "Working",
    currentRo: "RO 56321",
    vehicle: "2021 Ford F-150",
    operation: "Front brakes",
    soldHours: 2.5,
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
    soldHours: 1.5,
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
    soldHours: 3.2,
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
    soldHours: 0,
    elapsed: "11m idle",
    nextRo: "RO 56328",
    nextVehicle: "2020 Ford Explorer",
  },
];

const dispatchQueue = [
  {
    priority: "Urgent",
    ro: "56328",
    vehicle: "2020 Ford Explorer",
    work: "No-start diagnostic",
    waiting: "22 min",
    recommended: "Mitch",
  },
  {
    priority: "High",
    ro: "56331",
    vehicle: "2021 Honda Accord",
    work: "MPI and oil change",
    waiting: "14 min",
    recommended: "Kevin",
  },
  {
    priority: "Normal",
    ro: "56340",
    vehicle: "2019 Chevrolet Tahoe",
    work: "Front brakes",
    waiting: "8 min",
    recommended: "Cesar",
  },
];

const appointments = [
  {
    time: "9:30 AM",
    vehicle: "2022 Ram 1500",
    service: "Oil change and tire rotation",
    status: "Arrived",
  },
  {
    time: "10:00 AM",
    vehicle: "2020 Nissan Rogue",
    service: "Battery diagnosis",
    status: "Expected",
  },
  {
    time: "10:30 AM",
    vehicle: "Fleet — 3 Transit vans",
    service: "Preventive maintenance",
    status: "Expected",
  },
];

function statusClass(status: string) {
  if (status === "Working") return "status status-working";
  if (status === "Waiting") return "status status-waiting";
  return "status status-available";
}

export default function Home() {
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
            <a className="nav-item active" href="#">
              <span>▦</span>
              Command Center
            </a>

            <a className="nav-item" href="#">
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

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Thursday, July 16</p>
            <h1>Shop Command Center</h1>
            <p className="page-description">
              Live workload, technician flow and department pace.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="live-indicator">
              <span className="live-dot" />
              Live
            </div>
            <button className="secondary-button">Open TV Mode</button>
            <button className="primary-button">+ Add Repair Order</button>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card">
            <div className="metric-label">Labor Hours Closed</div>
            <div className="metric-row">
              <strong>14.2</strong>
              <span>of 32</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar progress-red" style={{ width: "44%" }} />
            </div>
            <div className="metric-footer">
              <span>44% of goal</span>
              <span className="negative">17.8 remaining</span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Projected Finish</div>
            <div className="metric-row">
              <strong>28.8</strong>
              <span>hours</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-bar progress-yellow"
                style={{ width: "90%" }}
              />
            </div>
            <div className="metric-footer">
              <span>Current pace</span>
              <span className="warning">3.2-hour gap</span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Waiting Dispatch</div>
            <div className="metric-row">
              <strong>4</strong>
              <span>vehicles</span>
            </div>
            <div className="metric-footer metric-footer-spaced">
              <span>Oldest wait</span>
              <span className="negative">22 minutes</span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Recoverable Hours</div>
            <div className="metric-row">
              <strong>8.6</strong>
              <span>hours</span>
            </div>
            <div className="metric-footer metric-footer-spaced">
              <span>Still available today</span>
              <span className="positive">$1,290</span>
            </div>
          </article>
        </section>

        <section className="main-grid">
          <div className="panel technician-panel">
            <div className="panel-heading">
              <div>
                <h2>Technician Flow</h2>
                <p>Current and next assignments</p>
              </div>
              <button className="text-button">Manage technicians →</button>
            </div>

            <div className="technician-list">
              {technicians.map((technician) => (
                <article className="technician-row" key={technician.name}>
                  <div className="technician-identity">
                    <div className="avatar">{technician.initials}</div>
                    <div>
                      <div className="technician-name">{technician.name}</div>
                      <div className={statusClass(technician.status)}>
                        <span />
                        {technician.status}
                      </div>
                    </div>
                  </div>

                  <div className="assignment">
                    <div className="assignment-label">Current</div>
                    <strong>{technician.currentRo}</strong>
                    <span>{technician.vehicle}</span>
                    <small>{technician.operation}</small>
                  </div>

                  <div className="time-block">
                    <div className="assignment-label">Sold</div>
                    <strong>{technician.soldHours.toFixed(1)} hrs</strong>
                    <span>{technician.elapsed}</span>
                  </div>

                  <div className="assignment next-assignment">
                    <div className="assignment-label">Next</div>
                    <strong>{technician.nextRo}</strong>
                    <span>{technician.nextVehicle}</span>
                  </div>

                  <button className="row-action">•••</button>
                </article>
              ))}
            </div>
          </div>

          <div className="right-column">
            <div className="panel alert-panel">
              <div className="panel-heading">
                <div>
                  <h2>Action Required</h2>
                  <p>Highest-impact issues right now</p>
                </div>
                <span className="alert-count">3</span>
              </div>

              <div className="alert-list">
                <div className="alert-item alert-danger">
                  <div className="alert-icon">!</div>
                  <div>
                    <strong>Mitch has been idle for 11 minutes</strong>
                    <p>RO 56328 is ready and recommended for dispatch.</p>
                  </div>
                </div>

                <div className="alert-item alert-warning">
                  <div className="alert-icon">◷</div>
                  <div>
                    <strong>RO 56304 is waiting for approval</strong>
                    <p>3.2 labor hours have been pending for 38 minutes.</p>
                  </div>
                </div>

                <div className="alert-item alert-info">
                  <div className="alert-icon">↗</div>
                  <div>
                    <strong>Two appointments arrive within 30 minutes</strong>
                    <p>No technician has been reserved for one appointment.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming</h2>
                  <p>Next scheduled arrivals</p>
                </div>
                <button className="text-button">View all →</button>
              </div>

              <div className="appointment-list">
                {appointments.map((appointment) => (
                  <div
                    className="appointment-row"
                    key={`${appointment.time}-${appointment.vehicle}`}
                  >
                    <div className="appointment-time">{appointment.time}</div>
                    <div className="appointment-details">
                      <strong>{appointment.vehicle}</strong>
                      <span>{appointment.service}</span>
                    </div>
                    <span
                      className={
                        appointment.status === "Arrived"
                          ? "appointment-status arrived"
                          : "appointment-status"
                      }
                    >
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel queue-panel">
          <div className="panel-heading">
            <div>
              <h2>Dispatch Queue</h2>
              <p>Vehicles ready or waiting for technician assignment</p>
            </div>
            <button className="secondary-button">Open Dispatch Board</button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>RO</th>
                  <th>Vehicle</th>
                  <th>Work Requested</th>
                  <th>Waiting</th>
                  <th>Recommended Tech</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {dispatchQueue.map((item) => (
                  <tr key={item.ro}>
                    <td>
                      <span
                        className={`priority priority-${item.priority.toLowerCase()}`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <strong>RO {item.ro}</strong>
                    </td>
                    <td>{item.vehicle}</td>
                    <td>{item.work}</td>
                    <td>{item.waiting}</td>
                    <td>{item.recommended}</td>
                    <td>
                      <button className="assign-button">Assign</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}