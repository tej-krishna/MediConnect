import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMyApplication,
  uploadDocument,
  submitApplication,
  updateListingInfo,
  PROVIDER_TYPE_LABELS,
} from '../services/providerService';
import {
  createSlot,
  listProviderSlots,
  cancelSlot,
  listProviderAppointments,
} from '../services/schedulingService';
import {
  createMedicineItem,
  listPharmacyMedicines,
  updateMedicineItem,
  listPharmacyOrders,
  transitionOrder,
} from '../services/pharmacyService';
import {
  createTest,
  listLabTests,
  listLabOrders,
  transitionDiagnosticOrder,
  uploadReport,
  createCamp,
  listProviderCamps,
  cancelCamp,
} from '../services/diagnosticsService';
import { ApiError } from '../services/apiClient';
import type { OwnerProviderApplication } from '../types/provider';
import type { Slot, Appointment } from '../types/scheduling';
import type { Medicine, Order, OrderStatus } from '../types/pharmacy';
import type { DiagnosticTest, DiagnosticOrder, DiagnosticOrderStatus, HealthCamp } from '../types/diagnostics';
import './ProviderDashboardPage.css';

// diagnostic_lab deliberately excluded: labs book through their own DiagnosticOrder flow
// (collection method + preferred time tied to specific tests), not the generic Slot/Appointment
// system doctors/hospitals/clinics use.
const SCHEDULING_TYPES = new Set(['doctor', 'hospital', 'clinic']);
const CAMP_TYPES = new Set(['mobile_van_operator', 'ngo_coordinator']);

const NEXT_ORDER_ACTION: Partial<Record<OrderStatus, { action: string; label: string }>> = {
  placed: { action: 'confirm', label: 'Confirm' },
  confirmed: { action: 'start_preparing', label: 'Start preparing' },
  preparing: { action: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { action: 'deliver', label: 'Mark delivered' },
};

const NEXT_DIAGNOSTIC_ACTION: Partial<Record<DiagnosticOrderStatus, { action: string; label: string }>> = {
  requested: { action: 'schedule', label: 'Schedule' },
  scheduled: { action: 'mark_collected', label: 'Mark sample collected' },
  sample_collected: { action: 'start_processing', label: 'Start processing' },
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft — add documents and submit for review',
  submitted: 'Submitted — waiting for review to begin',
  under_review: 'Under review',
  approved: 'Approved and verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
  expired: 'Verification expired',
};

export function ProviderDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<OwnerProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState('registration_certificate');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [fee, setFee] = useState('');
  const [hoursNote, setHoursNote] = useState('');
  const [savingListing, setSavingListing] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('1');
  const [creatingSlot, setCreatingSlot] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medName, setMedName] = useState('');
  const [medGeneric, setMedGeneric] = useState('');
  const [medIngredient, setMedIngredient] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medForm, setMedForm] = useState('tablet');
  const [medPrice, setMedPrice] = useState('');
  const [medStock, setMedStock] = useState('');
  const [medRx, setMedRx] = useState(false);
  const [creatingMedicine, setCreatingMedicine] = useState(false);
  const [pharmacyOrders, setPharmacyOrders] = useState<Order[]>([]);

  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [testName, setTestName] = useState('');
  const [testCategory, setTestCategory] = useState('');
  const [testSampleType, setTestSampleType] = useState('');
  const [testPrice, setTestPrice] = useState('');
  const [testTurnaround, setTestTurnaround] = useState('24');
  const [testHomeCollection, setTestHomeCollection] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [labOrders, setLabOrders] = useState<DiagnosticOrder[]>([]);
  const [scheduleDateTimes, setScheduleDateTimes] = useState<Record<string, string>>({});

  const [camps, setCamps] = useState<HealthCamp[]>([]);
  const [campTitle, setCampTitle] = useState('');
  const [campLocation, setCampLocation] = useState('');
  const [campDate, setCampDate] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campCapacity, setCampCapacity] = useState('20');
  const [creatingCamp, setCreatingCamp] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const app = await getMyApplication(id);
      setApplication(app);
      setFee(app.consultationFee !== null ? String(app.consultationFee) : '');
      setHoursNote(app.operatingHoursNote ?? '');
      if (app.status === 'approved' && SCHEDULING_TYPES.has(app.providerType)) {
        const [slotList, appointmentList] = await Promise.all([
          listProviderSlots(id),
          listProviderAppointments(id),
        ]);
        setSlots(slotList);
        setAppointments(appointmentList);
      }
      if (app.status === 'approved' && app.providerType === 'pharmacy') {
        const [medicineList, orderList] = await Promise.all([listPharmacyMedicines(id), listPharmacyOrders(id)]);
        setMedicines(medicineList);
        setPharmacyOrders(orderList);
      }
      if (app.status === 'approved' && app.providerType === 'diagnostic_lab') {
        const [testList, orderList] = await Promise.all([listLabTests(id), listLabOrders(id)]);
        setTests(testList);
        setLabOrders(orderList);
      }
      if (app.status === 'approved' && CAMP_TYPES.has(app.providerType)) {
        setCamps(await listProviderCamps(id));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this application.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!id || !file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(id, documentType, file);
      setFile(null);
      setMessage('Document uploaded.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!id) return;
    setError(null);
    try {
      await submitApplication(id);
      setMessage('Application submitted for review.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit.');
    }
  }

  async function handleSaveListing(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingListing(true);
    setError(null);
    try {
      await updateListingInfo(id, {
        consultationFee: fee ? Number(fee) : undefined,
        operatingHoursNote: hoursNote || undefined,
      });
      setMessage('Listing details updated.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSavingListing(false);
    }
  }

  async function handleCreateSlot(e: FormEvent) {
    e.preventDefault();
    if (!id || !slotDate || !slotStart || !slotEnd) return;
    setCreatingSlot(true);
    setError(null);
    try {
      await createSlot(id, {
        startTime: new Date(`${slotDate}T${slotStart}`).toISOString(),
        endTime: new Date(`${slotDate}T${slotEnd}`).toISOString(),
        capacity: Number(slotCapacity) || 1,
      });
      setMessage('Slot created.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create slot.');
    } finally {
      setCreatingSlot(false);
    }
  }

  async function handleCancelSlot(slotId: string) {
    if (!id) return;
    setError(null);
    try {
      await cancelSlot(id, slotId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel slot.');
    }
  }

  async function handleCreateMedicine(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setCreatingMedicine(true);
    setError(null);
    try {
      await createMedicineItem(id, {
        name: medName,
        genericName: medGeneric,
        activeIngredient: medIngredient,
        strength: medStrength,
        dosageForm: medForm,
        manufacturer: null,
        unitPrice: Number(medPrice) || 0,
        stockQuantity: Number(medStock) || 0,
        requiresPrescription: medRx,
      });
      setMedName('');
      setMedGeneric('');
      setMedIngredient('');
      setMedStrength('');
      setMedPrice('');
      setMedStock('');
      setMedRx(false);
      setMessage('Medicine added to inventory.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add medicine.');
    } finally {
      setCreatingMedicine(false);
    }
  }

  async function handleStockChange(medicineId: string, stockQuantity: number) {
    if (!id) return;
    try {
      await updateMedicineItem(id, medicineId, { stockQuantity });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update stock.');
    }
  }

  async function handleOrderAction(orderId: string, action: string) {
    setError(null);
    try {
      await transitionOrder(orderId, action);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update order status.');
    }
  }

  async function handleCreateTest(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setCreatingTest(true);
    setError(null);
    try {
      await createTest(id, {
        name: testName,
        category: testCategory,
        sampleType: testSampleType,
        price: Number(testPrice) || 0,
        turnaroundHours: Number(testTurnaround) || 24,
        homeCollectionAvailable: testHomeCollection,
      });
      setTestName('');
      setTestCategory('');
      setTestSampleType('');
      setTestPrice('');
      setTestHomeCollection(false);
      setMessage('Test added to catalogue.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add test.');
    } finally {
      setCreatingTest(false);
    }
  }

  async function handleDiagnosticAction(orderId: string, action: string, preferredDateTime?: string) {
    setError(null);
    try {
      if (action === 'schedule') {
        const chosen = scheduleDateTimes[orderId];
        const confirmedDateTime = chosen ? new Date(chosen).toISOString() : preferredDateTime;
        if (!confirmedDateTime) {
          setError('Pick a date and time to confirm first.');
          return;
        }
        await transitionDiagnosticOrder(orderId, { action, confirmedDateTime });
      } else {
        await transitionDiagnosticOrder(orderId, { action });
      }
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this booking.');
    }
  }

  async function handleReportUpload(orderId: string, reportFile: File | null) {
    if (!reportFile) return;
    setError(null);
    try {
      await uploadReport(orderId, reportFile);
      setMessage('Report uploaded.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the report.');
    }
  }

  async function handleCreateCamp(e: FormEvent) {
    e.preventDefault();
    if (!id || !campDate || !campStart || !campEnd) return;
    setCreatingCamp(true);
    setError(null);
    try {
      await createCamp(id, {
        title: campTitle,
        locationDescription: campLocation,
        scheduledDate: new Date(campDate).toISOString(),
        startTime: campStart,
        endTime: campEnd,
        servicesOffered: [],
        capacity: Number(campCapacity) || 1,
      });
      setCampTitle('');
      setCampLocation('');
      setMessage('Camp scheduled.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not schedule camp.');
    } finally {
      setCreatingCamp(false);
    }
  }

  async function handleCancelCamp(campId: string) {
    if (!id) return;
    setError(null);
    try {
      await cancelCamp(id, campId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel camp.');
    }
  }

  if (loading) return <div className="page-loading">Loading dashboard…</div>;
  if (!application) return <div className="page-error">{error ?? 'Application not found.'}</div>;

  return (
    <div className="container dashboard-page">
      <h1>{application.organizationName}</h1>
      <p className="text-muted">{PROVIDER_TYPE_LABELS[application.providerType] ?? application.providerType}</p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3>Status: {STATUS_LABELS[application.status] ?? application.status}</h3>
        {application.rejectionReason && <p className="text-muted">Reason: {application.rejectionReason}</p>}
        {application.suspensionReason && <p className="text-muted">Reason: {application.suspensionReason}</p>}
      </div>

      {(application.status === 'draft' || application.status === 'submitted' || application.status === 'under_review') && (
        <div className="card">
          <h3>Verification documents</h3>
          <ul>
            {application.documents.map((doc) => (
              <li key={doc.id}>
                {doc.documentType}: {doc.originalFilename}
              </li>
            ))}
          </ul>
          {application.status === 'draft' && (
            <>
              <form onSubmit={handleUpload} className="inline-form">
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="registration_certificate">Registration certificate</option>
                  <option value="medical_license">Medical license</option>
                  <option value="facility_license">Facility license</option>
                  <option value="identity_proof">Identity proof</option>
                </select>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button type="submit" className="btn btn-secondary" disabled={!file || uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </form>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={handleSubmitForReview}
                disabled={application.documents.length === 0}
              >
                Submit for review
              </button>
            </>
          )}
        </div>
      )}

      {application.status === 'approved' && (
        <>
          <div className="card">
            <h3>Listing details</h3>
            <form onSubmit={handleSaveListing} className="inline-form">
              <div className="form-field">
                <label htmlFor="fee">Consultation fee (₹)</label>
                <input id="fee" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="hoursNote">Operating hours</label>
                <input id="hoursNote" value={hoursNote} onChange={(e) => setHoursNote(e.target.value)} placeholder="e.g. Mon-Sat 9am-8pm" />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={savingListing}>
                {savingListing ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>

          {SCHEDULING_TYPES.has(application.providerType) && (
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

          {SCHEDULING_TYPES.has(application.providerType) && (
          <div className="card">
            <h3>Appointments</h3>
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Booked at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id}>
                    <td>{new Date(appt.bookedAt).toLocaleString()}</td>
                    <td>{appt.status}</td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-muted">
                      No appointments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {application.providerType === 'pharmacy' && (
            <>
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
                            style={{ width: 70 }}
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

              <div className="card">
                <h3>Orders</h3>
                <table className="simple-table">
                  <thead>
                    <tr>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacyOrders.map((order) => {
                      const next = NEXT_ORDER_ACTION[order.status];
                      return (
                        <tr key={order.id}>
                          <td>{order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</td>
                          <td>₹{order.totalAmount}</td>
                          <td>{order.status.replace(/_/g, ' ')}</td>
                          <td>
                            {next && (
                              <button className="btn btn-secondary" onClick={() => handleOrderAction(order.id, next.action)}>
                                {next.label}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {pharmacyOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          No orders yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {application.providerType === 'diagnostic_lab' && (
            <>
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

              <div className="card">
                <h3>Test bookings</h3>
                <table className="simple-table">
                  <thead>
                    <tr>
                      <th>Tests</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {labOrders.map((order) => {
                      const next = NEXT_DIAGNOSTIC_ACTION[order.status];
                      return (
                        <tr key={order.id}>
                          <td>{order.tests.map((t) => t.name).join(', ')}</td>
                          <td>{order.collectionMethod === 'home_collection' ? 'Home' : 'At lab'}</td>
                          <td>{order.status.replace(/_/g, ' ')}</td>
                          <td>
                            {next && next.action === 'schedule' && (
                              <input
                                type="datetime-local"
                                style={{ marginRight: 8 }}
                                value={scheduleDateTimes[order.id] ?? ''}
                                onChange={(e) =>
                                  setScheduleDateTimes((prev) => ({ ...prev, [order.id]: e.target.value }))
                                }
                              />
                            )}
                            {next && (
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleDiagnosticAction(order.id, next.action, order.preferredDateTime)}
                              >
                                {next.label}
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png"
                                style={{ marginLeft: 8, maxWidth: 160, display: 'inline-block' }}
                                onChange={(e) => handleReportUpload(order.id, e.target.files?.[0] ?? null)}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {labOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          No bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {CAMP_TYPES.has(application.providerType) && (
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
        </>
      )}
    </div>
  );
}
