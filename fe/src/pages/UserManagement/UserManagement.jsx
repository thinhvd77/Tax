import React, {useState, useEffect} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import api from '../../lib/api';
import './UserManagement.css';
import Toast from '../../components/Toast';

const BRANCH_OPTIONS = ['Hội sở', 'Chi nhánh 6', 'Chi nhánh Nam Hoa'];

const UserManagement = () => {
    const {user, isAdmin} = useAuth();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [toast, setToast] = useState({show: false, message: '', type: 'info'});
    const [formData, setFormData] = useState({
        employeeCode: '',
        fullName: '',
        department: '',
        branch: '',
        password: '',
        role: 'UPLOADER'
    });

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
            // Remove the stats fetch since the endpoint doesn't exist
        }
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/admin/users');
            setUsers(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    // Remove fetchStats function since the endpoint doesn't exist

    const showToast = (message, type = 'info') => setToast({show: true, message, type});

    const handleCreateUser = async (e) => {
        e.preventDefault();

        if (!formData.employeeCode || !formData.fullName || !formData.department || !formData.branch || !formData.password) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            await api.post('/api/admin/users', formData);
            setShowCreateModal(false);
            setFormData({
                employeeCode: '',
                fullName: '',
                department: '',
                branch: '',
                password: '',
                role: 'UPLOADER'
            });
            await fetchUsers();
            showToast('User created successfully!', 'success');
        } catch (err) {
            console.error('Error creating user:', err);
            showToast(err.response?.data?.message || 'Failed to create user', 'error');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();

        if (!formData.fullName || !formData.department || !formData.branch) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const updateData = {
                fullName: formData.fullName,
                department: formData.department,
                branch: formData.branch,
                role: formData.role
            };

            // Only include password if it's provided
            if (formData.password.trim()) {
                updateData.password = formData.password;
            }

            await api.put(`/api/admin/users/${editingUser.employeeCode}`, updateData);
            setShowEditModal(false);
            setEditingUser(null);
            setFormData({
                employeeCode: '',
                fullName: '',
                department: '',
                branch: '',
                password: '',
                role: 'UPLOADER'
            });
            await fetchUsers();
            showToast('User updated successfully!', 'success');
        } catch (err) {
            console.error('Error updating user:', err);
            showToast(err.response?.data?.message || 'Failed to update user', 'error');
        }
    };

    const handleDeleteUser = async (userToDelete) => {
        if (!confirm(`Are you sure you want to delete user "${userToDelete.fullName}"?`)) {
            return;
        }

        try {
            await api.delete(`/api/admin/users/${userToDelete.employeeCode}`);
            await fetchUsers();
            showToast('User deleted successfully!', 'success');
        } catch (err) {
            console.error('Error deleting user:', err);
            showToast(err.response?.data?.message || 'Failed to delete user', 'error');
        }
    };

    const openEditModal = (userToEdit) => {
        setEditingUser(userToEdit);
        setFormData({
            employeeCode: userToEdit.employeeCode,
            fullName: userToEdit.fullName,
            department: userToEdit.department,
            branch: userToEdit.branch,
            password: '',
            role: userToEdit.role
        });
        setShowEditModal(true);
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setEditingUser(null);
        setFormData({
            employeeCode: '',
            fullName: '',
            department: '',
            branch: '',
            password: '',
            role: 'UPLOADER'
        });
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'ADMIN':
                return 'role-badge admin';
            case 'UPLOADER':
                return 'role-badge uploader';
            default:
                return 'role-badge reviewer';
        }
    };

    if (!isAdmin) {
        return (
            <div className="user-management-container">
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>You need admin privileges to access user management.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="user-management-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-management-container">
            <Toast show={toast.show} message={toast.message} type={toast.type}
                   onClose={() => setToast(prev => ({...prev, show: false}))}/>
            {/* Header */}
            <div className="page-header">
                <h1>User Management</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                >
                    + Create User
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}

            {/* Users Table */}
            <div className="users-section">
                <div className="section-header">
                    <h2>All Users ({users.length})</h2>
                </div>

                {users.length === 0 ? (
                    <div className="empty-state">
                        <p>No users found</p>
                    </div>
                ) : (
                    <div className="users-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Mã nhân viên</th>
                                <th>Họ và tên</th>
                                <th>Phòng ban</th>
                                <th>Chi nhánh</th>
                                <th>Vai trò</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(userItem => (
                                <tr key={userItem.employeeCode}>
                                    <td>{userItem.employeeCode}</td>
                                    <td>
                                        <div className="user-info">
                                            <span>{userItem.fullName}</span>
                                        </div>
                                    </td>
                                    <td>{userItem.department}</td>
                                    <td>{userItem.branch}</td>
                                    <td>
                      <span className={getRoleBadgeClass(userItem.role)}>
                        {userItem.role}
                      </span>
                                    </td>
                                    <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => openEditModal(userItem)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                Edit
                                            </button>
                                            {userItem.employeeCode !== user.employeeCode && (
                                                <button
                                                    onClick={() => handleDeleteUser(userItem)}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Tạo mới người dùng</h3>
                            <button onClick={closeModals} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Mã nhân viên <span style={{color: 'red'}}>*</span></label>
                                    <input
                                        type="text"
                                        value={formData.employeeCode}
                                        onChange={(e) => setFormData({...formData, employeeCode: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Họ và tên <span style={{color: 'red'}}>*</span></label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phòng ban <span style={{color: 'red'}}>*</span></label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        required
                                    >
                                        <option value="" disabled>Chọn phòng ban</option>
                                        <option value="Kế toán & ngân quỹ">Kế toán & ngân quỹ</option>
                                        <option value="Tổng hợp">Tổng hợp</option>
                                        <option value="IT">IT</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Chi nhánh <span style={{color: 'red'}}>*</span></label>
                                    <select
                                        value={formData.branch}
                                        onChange={(e) => setFormData({...formData, branch: e.target.value})}
                                        required
                                    >
                                        <option value="" disabled>Chọn chi nhánh</option>
                                        {BRANCH_OPTIONS.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Mật khẩu <span style={{color: 'red'}}>*</span></label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    >
                                        <option value="UPLOADER">Uploader</option>
                                        <option value="REVIEWER">Reviewer</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={closeModals} className="btn cancel-create-btn">
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Tạo mới
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit User</h3>
                            <button onClick={closeModals} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleEditUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Employee Code</label>
                                    <input
                                        type="text"
                                        value={formData.employeeCode}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Department *</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Branch *</label>
                                    <select
                                        value={formData.branch}
                                        onChange={(e) => setFormData({...formData, branch: e.target.value})}
                                        required
                                    >
                                        <option value="" disabled>Select branch</option>
                                        {BRANCH_OPTIONS.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>New Password (leave blank to keep current)</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    >
                                        <option value="UPLOADER">Uploader</option>
                                        <option value="REVIEWER">Reviewer</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={closeModals} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
