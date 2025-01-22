import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { PlusCircle, Trash2, Edit2, Shield, UserX, UserCheck } from 'lucide-react';

export default function AdminUsers() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const res = await fetch(`/api/admin/approve-user/${userId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve user');
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeny = async (userId) => {
    try {
      const res = await fetch(`/api/admin/deny-user/${userId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to deny user');
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetRole = async (userId, role) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e, isEdit = false) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: formData.get('role'),
      is_approved: formData.get('is_approved') === 'true',
    };

    if (!isEdit) {
      userData.password = formData.get('password');
    }

    try {
      const res = await fetch(`/api/admin/users${isEdit ? `/${editingUser.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      setEditingUser(null);
      setIsAddingUser(false);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const UserForm = ({ user = null, onSubmit, onCancel }) => (
    <form onSubmit={(e) => onSubmit(e, !!user)} className="bg-white p-6 rounded-lg shadow-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            defaultValue={user?.name}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={user?.email}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        {!user && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            name="role"
            defaultValue={user?.role || 'user'}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="is_approved"
            defaultValue={user?.is_approved ? 'true' : 'false'}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="true">Approved</option>
            <option value="false">Pending</option>
          </select>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {user ? 'Update User' : 'Add User'}
        </button>
      </div>
    </form>
  );

  return (
    <>
      <Head>
        <title>Admin - User Management</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
              <button
                onClick={() => setIsAddingUser(true)}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {isAddingUser && (
              <div className="mt-4">
                <UserForm onSubmit={handleSubmit} onCancel={() => setIsAddingUser(false)} />
              </div>
            )}

            {editingUser && (
              <div className="mt-4">
                <UserForm user={editingUser} onSubmit={handleSubmit} onCancel={() => setEditingUser(null)} />
              </div>
            )}

            <div className="mt-4 flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.is_approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingUser(user)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Edit user"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {user.role !== 'admin' && (
                                  <button
                                    onClick={() => handleSetRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                                    className="text-purple-600 hover:text-purple-900"
                                    title={user.role === 'admin' ? 'Remove admin role' : 'Make admin'}
                                  >
                                    <Shield className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {!user.is_approved ? (
                                  <button
                                    onClick={() => handleApprove(user.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Approve user"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeny(user.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Deny user"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
