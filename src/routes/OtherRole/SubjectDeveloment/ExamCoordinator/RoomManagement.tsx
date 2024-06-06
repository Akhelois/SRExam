import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import NavBarComponent from "../../../../components/ExamCoordinator/NavBarComponents";

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
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, roleFilter, searchQuery]);

  const fetchUsers = () => {
    invoke<User[]>('get_all_users', {})
      .then((fetchedUsers) => {
        console.log('Fetched users:', fetchedUsers); 
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);
      })
      .catch((error) => {
        console.error('Error fetching users:', error);
      });
  };

  const filterUsers = () => {
    let filtered = users;

    if (roleFilter !== 'All') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(user => {
        const { name, initial, nim } = user;
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (initial && initial.toLowerCase().includes(searchQuery.toLowerCase())) ||
               nim.includes(searchQuery);
      });
    }

    setFilteredUsers(filtered);
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

  return (
    <div className='h-screen'>
      <NavBarComponent />
      <h1>User Management</h1>
      <div>
        <label htmlFor="roleFilter" className='text_white'>Filter by Role:</label>
        <select id="roleFilter" value={roleFilter} onChange={handleRoleFilterChange} className='p-1 w-100 text-black'>
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
          className='p-2 w-500'
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
                <select
                  value={user.role}
                  onChange={(e) => handleRoleEdit(user.bn_number, e.target.value)}
                >
                  <option value="Student">Student</option>
                  <option value="Assistant">Assistant</option>
                  <option value="Subject Development">Subject Development</option>
                  <option value="Exam Coordinator">Exam Coordinator</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}