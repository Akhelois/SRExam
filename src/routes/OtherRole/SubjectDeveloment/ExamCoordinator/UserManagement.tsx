import React, { useState, useEffect } from 'react';
import NavBarComponent from "../../../../components/ExamCoordinator/NavBarComponents";

interface User {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/get_all_users');
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRoleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(event.target.value);
    if (event.target.value === 'All') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => user.role === event.target.value);
      setFilteredUsers(filtered);
    }
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    const filtered = users.filter(user => {
      const { name, initial, nim } = user;
      return name.toLowerCase().includes(event.target.value.toLowerCase()) ||
             (initial && initial.toLowerCase().includes(event.target.value.toLowerCase())) ||
             nim.includes(event.target.value);
    });
    setFilteredUsers(filtered);
  };

  return (
    <div className='h-screen'>
        <NavBarComponent/>
      <h1>User Management</h1>
      <div className='text-black'>
        <label htmlFor="roleFilter">Filter by Role:</label>
        <select id="roleFilter" value={roleFilter || 'All'} onChange={handleRoleFilterChange}>
          <option value="All">All</option>
          <option value="Student">Student</option>
          <option value="Assistant">Assistant</option>
          <option value="Subject Develpment">Subject Develpment</option>
          <option value="Exam Coordinator">Exam Coordinator</option>
        </select>
      </div>
      <div>
        <input
          type="text"
          placeholder="Search by name/initial/NIM"
          value={searchQuery}
          onChange={handleSearchInputChange}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>BN Number</th>
            <th>NIM</th>
            <th>Name</th>
            <th>Major</th>
            <th>Role</th>
            <th>Initial</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user.bn_number}>
              <td>{user.bn_number}</td>
              <td>{user.nim}</td>
              <td>{user.name}</td>
              <td>{user.major}</td>
              <td>{user.role}</td>
              <td>{user.initial || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}