import { useProviderDashboard } from './ProviderDashboardContext';
import { OFFERING_TYPE_LABELS } from '../../types/homecare';
import type { OfferingType } from '../../types/homecare';
import '../ProviderDashboardPage.css';

export function ProviderInventoryPage() {
  const {
    application,
    medicines,
    medName,
    setMedName,
    medGeneric,
    setMedGeneric,
    medIngredient,
    setMedIngredient,
    medStrength,
    setMedStrength,
    medForm,
    setMedForm,
    medPrice,
    setMedPrice,
    medStock,
    setMedStock,
    medRx,
    setMedRx,
    creatingMedicine,
    handleCreateMedicine,
    handleStockChange,

    tests,
    testName,
    setTestName,
    testCategory,
    setTestCategory,
    testSampleType,
    setTestSampleType,
    testPrice,
    setTestPrice,
    testTurnaround,
    setTestTurnaround,
    testHomeCollection,
    setTestHomeCollection,
    creatingTest,
    handleCreateTest,

    offerings,
    offeringName,
    setOfferingName,
    offeringCategory,
    setOfferingCategory,
    offeringType,
    setOfferingType,
    offeringPrice,
    setOfferingPrice,
    offeringQuantity,
    setOfferingQuantity,
    creatingOffering,
    handleCreateOffering,
    handleToggleOfferingActive,

    slots,
    slotDate,
    setSlotDate,
    slotStart,
    setSlotStart,
    slotEnd,
    setSlotEnd,
    slotCapacity,
    setSlotCapacity,
    creatingSlot,
    handleCreateSlot,
    handleCancelSlot,

    camps,
    campTitle,
    setCampTitle,
    campLocation,
    setCampLocation,
    campDate,
    setCampDate,
    campStart,
    setCampStart,
    campEnd,
    setCampEnd,
    campCapacity,
    setCampCapacity,
    creatingCamp,
    handleCreateCamp,
    handleCancelCamp,
  } = useProviderDashboard();

  if (!application || application.status !== 'approved') return null;

  const LOW_STOCK_THRESHOLD = 10;
  const providerType = application.providerType;

  return (
    <div className="dashboard-page">
      {providerType === 'pharmacy' && (
        <div className="card">
          <h3>Medicine inventory</h3>
          <form onSubmit={handleCreateMedicine} className="inline-form">
            <div className="form-field">
              <label htmlFor="medName">Name</label>
              <input id="medName" required value={medName} onChange={(e) => setMedName(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medGeneric">Generic name</label>
              <input id="medGeneric" required value={medGeneric} onChange={(e) => setMedGeneric(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medIngredient">Active ingredient</label>
              <input id="medIngredient" required value={medIngredient} onChange={(e) => setMedIngredient(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medStrength">Strength</label>
              <input id="medStrength" required placeholder="e.g. 500mg" value={medStrength} onChange={(e) => setMedStrength(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medForm">Dosage form</label>
              <select id="medForm" value={medForm} onChange={(e) => setMedForm(e.target.value)}>
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="syrup">Syrup</option>
                <option value="injection">Injection</option>
                <option value="ointment">Ointment</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="medPrice">Price (₹)</label>
              <input id="medPrice" type="number" min={0} required style={{ width: 90 }} value={medPrice} onChange={(e) => setMedPrice(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medStock">Stock</label>
              <input id="medStock" type="number" min={0} required style={{ width: 80 }} value={medStock} onChange={(e) => setMedStock(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medRx">
                <input id="medRx" type="checkbox" checked={medRx} onChange={(e) => setMedRx(e.target.checked)} style={{ marginRight: 6 }} />
                Prescription required
              </label>
            </div>
            <button type="submit" className="btn btn-secondary" disabled={creatingMedicine}>
              {creatingMedicine ? 'Adding…' : 'Add medicine'}
            </button>
          </form>

          <table className="simple-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rx</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr key={med.id}>
                  <td>
                    {med.name} ({med.strength})
                  </td>
                  <td>₹{med.unitPrice}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      style={{ width: 70, color: med.stockQuantity < LOW_STOCK_THRESHOLD ? 'var(--color-danger)' : undefined }}
                      defaultValue={med.stockQuantity}
                      onBlur={(e) => handleStockChange(med.id, Number(e.target.value))}
                    />
                  </td>
                  <td>{med.requiresPrescription ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {medicines.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No medicines in inventory yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {providerType === 'diagnostic_lab' && (
        <div className="card">
          <h3>Test catalogue</h3>
          <form onSubmit={handleCreateTest} className="inline-form">
            <div className="form-field">
              <label htmlFor="testName">Name</label>
              <input id="testName" required value={testName} onChange={(e) => setTestName(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="testCategory">Category</label>
              <input id="testCategory" required placeholder="e.g. blood, imaging" value={testCategory} onChange={(e) => setTestCategory(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="testSampleType">Sample type</label>
              <input id="testSampleType" required placeholder="e.g. blood, none" value={testSampleType} onChange={(e) => setTestSampleType(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="testPrice">Price (₹)</label>
              <input id="testPrice" type="number" min={0} required style={{ width: 90 }} value={testPrice} onChange={(e) => setTestPrice(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="testTurnaround">Turnaround (hrs)</label>
              <input id="testTurnaround" type="number" min={1} style={{ width: 80 }} value={testTurnaround} onChange={(e) => setTestTurnaround(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="testHomeCollection">
                <input id="testHomeCollection" type="checkbox" checked={testHomeCollection} onChange={(e) => setTestHomeCollection(e.target.checked)} style={{ marginRight: 6 }} />
                Home collection available
              </label>
            </div>
            <button type="submit" className="btn btn-secondary" disabled={creatingTest}>
              {creatingTest ? 'Adding…' : 'Add test'}
            </button>
          </form>

          <table className="simple-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Home collection</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>{test.name}</td>
                  <td>₹{test.price}</td>
                  <td>{test.homeCollectionAvailable ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No tests in catalogue yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {providerType === 'equipment_provider' && (
        <div className="card">
          <h3>Equipment & home-care offerings</h3>
          <form onSubmit={handleCreateOffering} className="inline-form">
            <div className="form-field">
              <label htmlFor="offeringName">Name</label>
              <input id="offeringName" required value={offeringName} onChange={(e) => setOfferingName(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="offeringCategory">Category</label>
              <input
                id="offeringCategory"
                required
                placeholder="e.g. mobility, respiratory, nursing"
                value={offeringCategory}
                onChange={(e) => setOfferingCategory(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="offeringType">Type</label>
              <select id="offeringType" value={offeringType} onChange={(e) => setOfferingType(e.target.value as OfferingType)}>
                {Object.entries(OFFERING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="offeringPrice">Price (₹)</label>
              <input
                id="offeringPrice"
                type="number"
                min={0}
                required
                style={{ width: 90 }}
                value={offeringPrice}
                onChange={(e) => setOfferingPrice(e.target.value)}
              />
            </div>
            {offeringType !== 'home_visit_service' && (
              <div className="form-field">
                <label htmlFor="offeringQuantity">Available quantity</label>
                <input
                  id="offeringQuantity"
                  type="number"
                  min={0}
                  required
                  style={{ width: 90 }}
                  value={offeringQuantity}
                  onChange={(e) => setOfferingQuantity(e.target.value)}
                />
              </div>
            )}
            <button type="submit" className="btn btn-secondary" disabled={creatingOffering}>
              {creatingOffering ? 'Adding…' : 'Add offering'}
            </button>
          </form>

          <table className="simple-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Price</th>
                <th>Available</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((offering) => (
                <tr key={offering.id}>
                  <td>{offering.name}</td>
                  <td>{OFFERING_TYPE_LABELS[offering.offeringType]}</td>
                  <td>₹{offering.price}</td>
                  <td>{offering.availableQuantity ?? '—'}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => handleToggleOfferingActive(offering.id, !offering.isActive)}>
                      {offering.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {offerings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No offerings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {['doctor', 'hospital', 'clinic'].includes(providerType) && (
        <div className="card">
          <h3>Appointment slots</h3>
          <form onSubmit={handleCreateSlot} className="inline-form">
            <div className="form-field">
              <label htmlFor="slotDate">Date</label>
              <input id="slotDate" type="date" required value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="slotStart">Start time</label>
              <input id="slotStart" type="time" required value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="slotEnd">End time</label>
              <input id="slotEnd" type="time" required value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="slotCapacity">Capacity</label>
              <input
                id="slotCapacity"
                type="number"
                min={1}
                style={{ width: 70 }}
                value={slotCapacity}
                onChange={(e) => setSlotCapacity(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={creatingSlot}>
              {creatingSlot ? 'Adding…' : 'Add slot'}
            </button>
          </form>

          <table className="simple-table">
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Booked</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td>{new Date(slot.startTime).toLocaleString()}</td>
                  <td>{new Date(slot.endTime).toLocaleTimeString()}</td>
                  <td>
                    {slot.bookedCount}/{slot.capacity}
                  </td>
                  <td>{slot.status}</td>
                  <td>
                    {slot.status === 'open' && (
                      <button className="btn btn-secondary" onClick={() => handleCancelSlot(slot.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {slots.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No slots yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {['mobile_van_operator', 'ngo_coordinator'].includes(providerType) && (
        <div className="card">
          <h3>Health camps</h3>
          <form onSubmit={handleCreateCamp} className="inline-form">
            <div className="form-field">
              <label htmlFor="campTitle">Title</label>
              <input id="campTitle" required value={campTitle} onChange={(e) => setCampTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="campLocation">Location</label>
              <input id="campLocation" required placeholder="e.g. Village Square, Wagholi" value={campLocation} onChange={(e) => setCampLocation(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="campDate">Date</label>
              <input id="campDate" type="date" required value={campDate} onChange={(e) => setCampDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="campStart">Start</label>
              <input id="campStart" type="time" required value={campStart} onChange={(e) => setCampStart(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="campEnd">End</label>
              <input id="campEnd" type="time" required value={campEnd} onChange={(e) => setCampEnd(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="campCapacity">Capacity</label>
              <input id="campCapacity" type="number" min={1} style={{ width: 80 }} value={campCapacity} onChange={(e) => setCampCapacity(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={creatingCamp}>
              {creatingCamp ? 'Scheduling…' : 'Schedule camp'}
            </button>
          </form>

          <table className="simple-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Registered</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {camps.map((camp) => (
                <tr key={camp.id}>
                  <td>{camp.title}</td>
                  <td>{new Date(camp.scheduledDate).toLocaleDateString()}</td>
                  <td>
                    {camp.registeredCount}/{camp.capacity}
                  </td>
                  <td>{camp.status}</td>
                  <td>
                    {camp.status === 'scheduled' && (
                      <button className="btn btn-secondary" onClick={() => handleCancelCamp(camp.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {camps.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No camps scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
