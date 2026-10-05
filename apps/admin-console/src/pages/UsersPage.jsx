import React, { useState, useEffect } from 'react';
import { fetchUsers } from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Users & Role Permissions</h1>
          <p className="page-subtitle">Super Admin, Admin, Franchise Agent, Vendor, Delivery Partner, and Customer directory</p>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="card-title">Authorized Identity Directory ({users.length})</h2>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Assigned Role</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><code>{user.id}</code></td>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>
                      <span className={`status-pill ${
                        user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
                          ? 'primary'
                          : user.role === 'AGENT'
                          ? 'success'
                          : user.role === 'VENDOR'
                          ? 'warning'
                          : 'neutral'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className="status-pill success">
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
