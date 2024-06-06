import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import NavBarComponent from "../../../../components/ExamCoordinator/NavBarComponents";
import Modal from 'react-modal';

type User = {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial?: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (roleFilter === 'All' || !roleFilter) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(user => user.role === roleFilter));
    }
  }, [roleFilter, users]);

  useEffect(() => {
    setFilteredUsers(users.filter(user => {
      const { name, initial, nim } = user;
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (initial && initial.toLowerCase().includes(searchQuery.toLowerCase())) ||
             nim.includes(searchQuery);
    }));
  }, [searchQuery, users]);

  const fetchUsers = () => {
    invoke<User[]>('get_all_users', {})
      .then((users) => {
        console.log('Fetched users:', users); 
        setUsers(users);
      })
      .catch((error) => {
        console.error('Error fetching users:', error);
      });
  };

  const handleRoleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(event.target.value);
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleRoleEdit = (bn_number: string, newRole: string) => {
    invoke('edit_role', { bnNumber: bn_number, newRole: newRole })
      .then(() => {
        const updatedUsers = users.map(user =>
          user.bn_number === bn_number ? { ...user, role: newRole } : user
        );
        console.log('Updated users:', updatedUsers);
        setUsers(updatedUsers);
      })
      .catch(error => {
        console.error('Error updating role:', error);
      });
  };

  const openModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(event.target.value);
  };

  const handleSave = () => {
    if (selectedUser) {
      if (selectedRole === "Choose Role") {
        setErrorMessage("Please choose a valid role.");
      } else if (selectedRole === selectedUser.role) {
        setErrorMessage("You have chosen the same role.");
      } else {
        handleRoleEdit(selectedUser.bn_number, selectedRole);
        closeModal();
      }
    }
  };

  return (
    <div className='h-screen'>
      <NavBarComponent />
      <h1 className='text-white'>User Management</h1>
      <div>
        <label htmlFor="roleFilter" className='text-white'>Filter by Role:</label>
        <select id="roleFilter" value={roleFilter || 'All'} onChange={handleRoleFilterChange} className='p-1 w-100 text-black'>
          <option value="All">All</option>
          <option value="Student">Student</option>
          <option value="Assistant">Assistant</option>
          <option value="Subject Development">Subject Development</option>
          <option value="Exam Coordinator">Exam Coordinator</option>
        </select>
      </div>
      <div>
        <input
          type="text"
          placeholder="Search by name/initial/NIM"
          value={searchQuery}
          className='p-2 w-500 text-white'
          onChange={handleSearchInputChange}
        />
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: 'white', color: 'black' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid black' }}>BN Number</th>
            <th style={{ border: '1px solid black' }}>NIM</th>
            <th style={{ border: '1px solid black' }}>Name</th>
            <th style={{ border: '1px solid black' }}>Major</th>
            <th style={{ border: '1px solid black' }}>Role</th>
            <th style={{ border: '1px solid black' }}>Initial</th>
            <th style={{ border: '1px solid black' }}>Edit Role</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user.bn_number} style={{ border: '1px solid black' }}>
              <td style={{ border: '1px solid black' }}>{user.bn_number}</td>
              <td style={{ border: '1px solid black' }}>{user.nim}</td>
              <td style={{ border: '1px solid black' }}>{user.name}</td>
              <td style={{ border: '1px solid black' }}>{user.major}</td>
              <td style={{ border: '1px solid black' }}>{user.role}</td>
              <td style={{ border: '1px solid black' }}>{user.initial || '-'}</td>
              <td style={{ border: '1px solid black' }}>
                <button onClick={() => openModal(user)} className='bg-black text-white w-100'>Edit Role</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Edit Role"
      >
        <h2 className='text-black'>Edit Role for {selectedUser?.name}</h2>
        <select value={selectedRole} onChange={handleRoleChange} className='text-black'>
          <option value="Choose Role">Choose Role</option>
          <option value="Student">Student</option>
          <option value="Assistant">Assistant</option>
          <option value="Subject Development">Subject Development</option>
          <option value="Exam Coordinator">Exam Coordinator</option>
        </select>
        {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
        <button onClick={handleSave} className='text-black'>Save</button>
        <button onClick={closeModal} className='text-black'>Cancel</button>
      </Modal>
    </div>
  );
}

Modal.setAppElement('#root');