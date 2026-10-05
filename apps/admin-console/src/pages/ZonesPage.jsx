import React, { useState, useEffect } from 'react';
import { fetchZones, saveZone } from '../api';

export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    zoneType: 'URBAN',
    radiusKm: 2.0,
    mode: 'EXPRESS_15MIN',
    ruralCutoffTime: '21:00',
    agentName: '',
    centerLat: 12.9352,
    centerLng: 77.6245,
  });

  const loadZones = async () => {
    setLoading(true);
    const data = await fetchZones();
    setZones(data);
    setLoading(false);
  };

  useEffect(() => {
    loadZones();
  }, []);

  const openCreateModal = () => {
    setEditingZone(null);
    setFormData({
      name: '',
      code: '',
      zoneType: 'URBAN',
      radiusKm: 2.0,
      mode: 'EXPRESS_15MIN',
      ruralCutoffTime: '21:00',
      agentName: '',
      centerLat: 12.9716,
      centerLng: 77.5946,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      code: zone.code,
      zoneType: zone.zoneType,
      radiusKm: zone.radiusKm,
      mode: zone.mode || (zone.zoneType === 'RURAL' ? 'NEXT_DAY_BATCH' : 'EXPRESS_15MIN'),
      ruralCutoffTime: zone.ruralCutoffTime || '21:00',
      agentName: zone.agentName || '',
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      radiusKm: parseFloat(formData.radiusKm),
      id: editingZone ? editingZone.id : undefined,
    };
    await saveZone(payload);
    setIsModalOpen(false);
    loadZones();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone Management & Territory Dispatch</h1>
          <p className="page-subtitle">Configure operating radii, fulfillment modes, rural cutoffs, and franchise agent assignments</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <span>➕</span>
          <span>Add New Zone</span>
        </button>
      </div>

      <div className="admin-card">
        <h2 className="card-title">Active Operating Clusters ({zones.length})</h2>
        {loading ? (
          <p>Loading zones...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Zone Code</th>
                  <th>Zone Name</th>
                  <th>Cluster Type</th>
                  <th>Radius (km)</th>
                  <th>Fulfillment Mode</th>
                  <th>Cutoff Time (IST)</th>
                  <th>Assigned Agent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td><strong>{zone.code}</strong></td>
                    <td>{zone.name}</td>
                    <td>
                      <span className={`status-pill ${
                        zone.zoneType === 'URBAN' ? 'primary' : zone.zoneType === 'SUB_URBAN' ? 'warning' : 'neutral'
                      }`}>
                        {zone.zoneType}
                      </span>
                    </td>
                    <td>{zone.radiusKm} km</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {zone.mode === 'EXPRESS_15MIN' && '⚡ 10-15 Min Express'}
                        {zone.mode === 'STANDARD_25MIN' && '🛵 15-25 Min Standard'}
                        {zone.mode === 'NEXT_DAY_BATCH' && '📦 Next-Day Batch (05:00-08:00)'}
                        {!zone.mode && zone.zoneType}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: zone.zoneType === 'RURAL' ? '#DC2626' : 'inherit', fontWeight: zone.zoneType === 'RURAL' ? 700 : 400 }}>
                        {zone.ruralCutoffTime || '21:00'}
                      </span>
                    </td>
                    <td>{zone.agentName || 'Unassigned'}</td>
                    <td>
                      <span className={`status-pill ${zone.isActive ? 'success' : 'danger'}`}>
                        {zone.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-outline btn-sm" onClick={() => openEditModal(zone)}>
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="card-title">
              {editingZone ? `Edit Zone: ${editingZone.code}` : 'Create New Operational Zone'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Zone Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Indiranagar Cluster"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Zone Code</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. ZN-BLR-03"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Zone Type</label>
                  <select
                    className="form-select"
                    value={formData.zoneType}
                    onChange={(e) => {
                      const zType = e.target.value;
                      let defaultMode = 'EXPRESS_15MIN';
                      let defaultRadius = 2.0;
                      if (zType === 'SUB_URBAN') {
                        defaultMode = 'STANDARD_25MIN';
                        defaultRadius = 3.5;
                      } else if (zType === 'RURAL') {
                        defaultMode = 'NEXT_DAY_BATCH';
                        defaultRadius = 7.5;
                      }
                      setFormData({
                        ...formData,
                        zoneType: zType,
                        mode: defaultMode,
                        radiusKm: defaultRadius,
                      });
                    }}
                  >
                    <option value="URBAN">URBAN (10-15 Min Express, 2.0 km)</option>
                    <option value="SUB_URBAN">SUB_URBAN (15-25 Min Standard)</option>
                    <option value="RURAL">RURAL (Next-Day Morning Batch)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Geofence Radius (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="20.0"
                    required
                    className="form-input"
                    value={formData.radiusKm}
                    onChange={(e) => setFormData({ ...formData, radiusKm: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fulfillment Mode</label>
                  <select
                    className="form-select"
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  >
                    <option value="EXPRESS_15MIN">EXPRESS_15MIN (Instant Dispatch)</option>
                    <option value="STANDARD_25MIN">STANDARD_25MIN</option>
                    <option value="NEXT_DAY_BATCH">NEXT_DAY_BATCH (05:00 - 08:00 Window)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Cutoff Time (Asia/Kolkata)</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.ruralCutoffTime}
                    onChange={(e) => setFormData({ ...formData, ruralCutoffTime: e.target.value })}
                    placeholder="21:00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Franchise Agent</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.agentName}
                  onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                  placeholder="Agent Name (e.g. Ramesh Gowda)"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingZone ? 'Save Changes' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
