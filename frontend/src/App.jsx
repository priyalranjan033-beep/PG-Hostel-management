
import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:2001';

function App() {
    const [rooms, setRooms] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [rents, setRents] = useState([]);
    const [page, setPage] = useState('Dashboard');
    const [message, setMessage] = useState('');

    const [room, setRoom] = useState({
        roomNumber: '',
        totalBeds: '',
        rent: ''
    });

    const [tenant, setTenant] = useState({
        name: '',
        phone: '',
        room: '',
        bedNumber: ''
    });

    const [complaint, setComplaint] = useState({
        tenantId: '',
        complaint: ''
    });

    
const loadData = async () => {
    try {
        const roomData = await axios.get(`${API}/rooms`);
        const tenantData = await axios.get(`${API}/tenants`);
        const rentData = await axios.get(`${API}/rents`);

        setRooms(roomData.data);
        setTenants(tenantData.data);
        setRents(rentData.data);
    } catch (error) {
        setMessage('Cannot connect to backend. Check the server.');
    }
};


    useEffect(() => {
        loadData();
    }, []);

    const activeTenants = tenants.filter(
        (t) => !t.checkOutDate
    );

    const showMessage = (text) => {
        setMessage(text);
        setTimeout(() => setMessage(''), 3000);
    };

    const addRoom = async (e) => {
        e.preventDefault();

        try {
            await axios.post(`${API}/rooms`, {
                roomNumber: room.roomNumber,
                totalBeds: Number(room.totalBeds),
                rent: Number(room.rent)
            });

            setRoom({
                roomNumber: '',
                totalBeds: '',
                rent: ''
            });

            await loadData();
            showMessage('Room added successfully');
        } catch (error) {
            showMessage(error.response?.data?.message || 'Failed to add room');
        }
    };

    const deleteRoom = async (id) => {
        if (!window.confirm('Delete this room?')) return;

        try {
            await axios.delete(`${API}/rooms/${id}`);
            await loadData();
            showMessage('Room deleted successfully');
        } catch (error) {
            showMessage(error.response?.data?.message || 'Failed to delete room');
        }
    };

    const checkIn = async (e) => {
        e.preventDefault();

        try {
            await axios.post(`${API}/tenants`, {
                ...tenant,
                bedNumber: Number(tenant.bedNumber)
            });

            setTenant({
                name: '',
                phone: '',
                room: '',
                bedNumber: ''
            });

            await loadData();
            showMessage('Tenant checked in successfully');
        } catch (error) {
            showMessage(error.response?.data?.message || 'Check-in failed');
        }
    };

    const checkOut = async (id) => {
        if (!window.confirm('Check out this tenant?')) return;

        try {
            await axios.put(`${API}/tenants/checkout/${id}`);
            await loadData();
            showMessage('Tenant checked out successfully');
        } catch (error) {
            showMessage(error.response?.data?.message || 'Check-out failed');
        }
    };

    const updateRent = async (rentId, amount) => {
    try {
        await axios.post(`${API}/rents/${rentId}/payments`, {
            amount: Number(amount)
        });

        await loadData();
        showMessage('Payment recorded successfully');
    } catch (error) {
        showMessage(
            error.response?.data?.message || 'Failed to record payment'
        );
    }
};

    const addComplaint = async (e) => {
        e.preventDefault();

        try {
            await axios.put(
                `${API}/tenants/complaint/${complaint.tenantId}`,
                { complaint: complaint.complaint }
            );

            setComplaint({ tenantId: '', complaint: '' });
            await loadData();
            showMessage('Complaint added successfully');
        } catch (error) {
            showMessage(error.response?.data?.message || 'Failed to add complaint');
        }
    };

    const updateComplaint = async (id, status) => {
        try {
            await axios.put(`${API}/tenants/complaint-status/${id}`, {
                complaintStatus: status
            });

            await loadData();
            showMessage('Complaint status updated');
        } catch (error) {
            showMessage('Failed to update complaint');
        }
    };

    const menu = [
        'Dashboard',
        'Rooms',
        'Tenants',
        'Rent',
        'Maintenance'
    ];

    const availableBeds = rooms.reduce(
        (total, r) => total + r.totalBeds - r.occupiedBeds,
        0
    );

    const pendingRent = activeTenants.filter(
        (t) => !t.rentPaid
    ).length;

    const complaints = tenants.filter(
        (t) => t.complaint
    );

    return (
        <div className="app">
            <aside className="sidebar">
                <h2>PG Manager</h2>
                <p className="sidebar-subtitle">Hostel Management</p>

                <nav>
                    {menu.map((item) => (
                        <button
                            key={item}
                            className={page === item ? 'active' : ''}
                            onClick={() => setPage(item)}
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <p className="sidebar-footer">Management Panel</p>
            </aside>

            <main className="main">
                <header className="topbar">
                    <div>
                        <h1>{page}</h1>
                        <p>Manage your PG and hostel efficiently.</p>
                    </div>
                </header>

                {message && <div className="message">{message}</div>}

                {page === 'Dashboard' && (
                    <>
                        <section className="stats">
                            <div className="stat-card">
                                <p>Total Rooms</p>
                                <h2>{rooms.length}</h2>
                            </div>

                            <div className="stat-card">
                                <p>Active Tenants</p>
                                <h2>{activeTenants.length}</h2>
                            </div>

                            <div className="stat-card">
                                <p>Available Beds</p>
                                <h2>{availableBeds}</h2>
                            </div>

                            <div className="stat-card">
                                <p>Pending Rent</p>
                                <h2>{pendingRent}</h2>
                            </div>
                        </section>

                        <section className="panel">
                            <h2>Room Overview</h2>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Room</th>
                                            <th>Total Beds</th>
                                            <th>Occupied</th>
                                            <th>Available</th>
                                            <th>Monthly Rent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map((r) => (
                                            <tr key={r._id}>
                                                <td>{r.roomNumber}</td>
                                                <td>{r.totalBeds}</td>
                                                <td>{r.occupiedBeds}</td>
                                                <td>{r.totalBeds - r.occupiedBeds}</td>
                                                <td>₹{r.rent}</td>
                                            </tr>
                                        ))}
                                        {rooms.length === 0 && (
                                            <tr>
                                                <td colSpan="5">No rooms added yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                {page === 'Rooms' && (
                    <>
                        <section className="panel">
                            <h2>Add Room</h2>

                            <form className="form-grid" onSubmit={addRoom}>
                                <input
                                    placeholder="Room number"
                                    value={room.roomNumber}
                                    onChange={(e) => setRoom({
                                        ...room,
                                        roomNumber: e.target.value
                                    })}
                                    required
                                />

                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Total beds"
                                    value={room.totalBeds}
                                    onChange={(e) => setRoom({
                                        ...room,
                                        totalBeds: e.target.value
                                    })}
                                    required
                                />

                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Monthly rent per bed (₹)"
                                    value={room.rent}
                                    onChange={(e) => setRoom({
                                        ...room,
                                        rent: e.target.value
                                    })}
                                    required
                                />

                                <button className="primary">Add Room</button>
                            </form>
                        </section>

                        <section className="panel">
                            <h2>All Rooms</h2>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Room</th>
                                            <th>Total Beds</th>
                                            <th>Occupied</th>
                                            <th>Available</th>
                                            <th>Rent/Bed</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map((r) => (
                                            <tr key={r._id}>
                                                <td>{r.roomNumber}</td>
                                                <td>{r.totalBeds}</td>
                                                <td>{r.occupiedBeds}</td>
                                                <td>{r.totalBeds - r.occupiedBeds}</td>
                                                <td>₹{r.rent}</td>
                                                <td>
                                                    <button
                                                        className="danger"
                                                        onClick={() => deleteRoom(r._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {rooms.length === 0 && (
                                            <tr>
                                                <td colSpan="6">No rooms available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                {page === 'Tenants' && (
                    <>
                        <section className="panel">
                            <h2>Tenant Check-in</h2>

                            <form className="form-grid" onSubmit={checkIn}>
                                <input
                                    placeholder="Tenant name"
                                    value={tenant.name}
                                    onChange={(e) => setTenant({
                                        ...tenant,
                                        name: e.target.value
                                    })}
                                    required
                                />

                                <input
                                    placeholder="Phone number"
                                    value={tenant.phone}
                                    onChange={(e) => setTenant({
                                        ...tenant,
                                        phone: e.target.value
                                    })}
                                    required
                                />

                                <select
                                    value={tenant.room}
                                    onChange={(e) => setTenant({
                                        ...tenant,
                                        room: e.target.value,
                                        bedNumber: ''
                                    })}
                                    required
                                >
                                    <option value="">Select room</option>
                                    {rooms.map((r) => (
                                        <option
                                            key={r._id}
                                            value={r._id}
                                            disabled={r.occupiedBeds >= r.totalBeds}
                                        >
                                            Room {r.roomNumber} (
                                            {r.totalBeds - r.occupiedBeds} beds available)
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    min="1"
                                    max={rooms.find((r) => r._id === tenant.room)?.totalBeds || 1}
                                    placeholder="Bed number"
                                    value={tenant.bedNumber}
                                    onChange={(e) => setTenant({
                                        ...tenant,
                                        bedNumber: e.target.value
                                    })}
                                    required
                                />

                                <button className="primary">Check In</button>
                            </form>
                        </section>

                        <section className="panel">
                            <h2>Tenant Records</h2>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Room</th>
                                            <th>Bed</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenants.map((t) => (
                                            <tr key={t._id}>
                                                <td>{t.name}</td>
                                                <td>{t.phone}</td>
                                                <td>{t.room?.roomNumber || 'Room deleted'}</td>
                                                <td>{t.bedNumber}</td>
                                                <td>
                                                    <span className={t.checkOutDate ? 'badge grey' : 'badge green'}>
                                                        {t.checkOutDate ? 'Checked out' : 'Active'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {!t.checkOutDate && (
                                                        <button
                                                            className="danger"
                                                            onClick={() => checkOut(t._id)}
                                                        >
                                                            Check Out
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {tenants.length === 0 && (
                                            <tr>
                                                <td colSpan="6">No tenants registered.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                
{page === 'Rent' && (
    <section className="panel">
        <h2>Monthly Rent Tracking</h2>

        <form
            className="form-grid"
            onSubmit={async (e) => {
                e.preventDefault();

                const form = e.target;

                try {
                    await axios.post(`${API}/rents/generate`, {
                        month: Number(form.month.value),
                        year: Number(form.year.value)
                    });

                    await loadData();
                    showMessage('Monthly rent records generated');
                } catch (error) {
                    showMessage(
                        error.response?.data?.message || 'Failed to generate rent'
                    );
                }
            }}
        >
            <select name="month" defaultValue={new Date().getMonth() + 1}>
                {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('en', {
                            month: 'long'
                        })}
                    </option>
                ))}
            </select>

            <input
                name="year"
                type="number"
                defaultValue={new Date().getFullYear()}
                min="2000"
                max="2100"
                required
            />

            <button className="primary">Generate Monthly Rent</button>
        </form>

        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Tenant</th>
                        <th>Month</th>
                        <th>Rent</th>
                        <th>Paid</th>
                        <th>Outstanding</th>
                        <th>Status</th>
                        <th>Payment</th>
                    </tr>
                </thead>

                <tbody>
                    {rents.map((r) => {
                        const outstanding = r.rentAmount - r.amountPaid;

                        return (
                            <tr key={r._id}>
                                <td>{r.tenant?.name || 'Tenant unavailable'}</td>
                                <td>{r.month}/{r.year}</td>
                                <td>₹{r.rentAmount}</td>
                                <td>₹{r.amountPaid}</td>
                                <td>₹{outstanding}</td>
                                <td>
                                    <span className={
                                        r.status === 'Paid'
                                            ? 'badge green'
                                            : r.status === 'Overdue'
                                            ? 'badge red'
                                            : 'badge grey'
                                    }>
                                        {r.status}
                                    </span>
                                </td>
                                <td>
                                    {outstanding > 0 && (
                                        <form
                                            onSubmit={async (e) => {
                                                e.preventDefault();

                                                const amount = Number(
                                                    e.target.amount.value
                                                );

                                                await updateRent(r._id, amount);
                                                e.target.reset();
                                            }}
                                        >
                                            <input
                                                name="amount"
                                                type="number"
                                                min="0.01"
                                                max={outstanding}
                                                step="0.01"
                                                placeholder="Amount ₹"
                                                required
                                            />
                                            <button className="primary">
                                                Pay
                                            </button>
                                        </form>
                                    )}
                                </td>
                            </tr>
                        );
                    })}

                    {rents.length === 0 && (
                        <tr>
                            <td colSpan="7">No rent records. Generate monthly rent first.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </section>
)}


                {page === 'Maintenance' && (
                    <>
                        <section className="panel">
                            <h2>Add Maintenance Complaint</h2>

                            <form className="form-grid" onSubmit={addComplaint}>
                                <select
                                    value={complaint.tenantId}
                                    onChange={(e) => setComplaint({
                                        ...complaint,
                                        tenantId: e.target.value
                                    })}
                                    required
                                >
                                    <option value="">Select tenant</option>
                                    {activeTenants.map((t) => (
                                        <option key={t._id} value={t._id}>
                                            {t.name} - Room {t.room?.roomNumber || '-'}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    placeholder="Describe the complaint"
                                    value={complaint.complaint}
                                    onChange={(e) => setComplaint({
                                        ...complaint,
                                        complaint: e.target.value
                                    })}
                                    required
                                />

                                <button className="primary">Add Complaint</button>
                            </form>
                        </section>

                        <section className="panel">
                            <h2>Maintenance Records</h2>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tenant</th>
                                            <th>Room</th>
                                            <th>Complaint</th>
                                            <th>Status</th>
                                            <th>Update</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {complaints.map((t) => (
                                            <tr key={t._id}>
                                                <td>{t.name}</td>
                                                <td>{t.room?.roomNumber || '-'}</td>
                                                <td>{t.complaint}</td>
                                                <td>
                                                    <span className={t.complaintStatus === 'Resolved' ? 'badge green' : 'badge red'}>
                                                        {t.complaintStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="primary"
                                                        disabled={t.complaintStatus === 'Resolved'}
                                                        onClick={() => updateComplaint(t._id, 'Resolved')}
                                                    >
                                                        Mark Resolved
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {complaints.length === 0 && (
                                            <tr>
                                                <td colSpan="5">No complaints recorded.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
