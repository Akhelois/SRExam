import React, { useEffect, useState, ChangeEvent } from 'react';
import { invoke } from '@tauri-apps/api';
import {
  Button,
  Container,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

type User = {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial?: string;
}

type Subject = {
  subject_code_str: string;
  subject_name: string;
}

type Room = {
  campus: string;
  room_capacity: number;
  room_number_str: string;
}

type Enrollment = {
  class_code_str: string;
  nim: string;
  subject_code: string;
}

type Shift = {
  shift_id: string;
  start_time: string;
  end_time: string;
}

type ExamTransaction = {
  transaction_id: string;
  subject_code: string;
  room_number: string;
  shift_id: string;
  transaction_date: string;
  proctor?: string;
  status?: string;
}

export default function ReportManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [examTransactions, setExamTransactions] = useState<ExamTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [dialogData, setDialogData] = useState<ExamTransaction | null>(null);

  useEffect(() => {
    invoke('get_all_users').then((response: any) => setUsers(response));
    invoke('get_all_subjects').then((response: any) => setSubjects(response));
    invoke('get_all_rooms').then((response: any) => setRooms(response));
    invoke('get_all_enrollments').then((response: any) => setEnrollments(response));
    invoke('get_all_shifts').then((response: any) => setShifts(response));
    invoke('get_exam_transactions').then((response: any) => setExamTransactions(response));
  }, []);

  const handleDialogOpen = (transaction: ExamTransaction) => {
    setDialogData(transaction);
    setOpen(true);
  };

  const handleDialogClose = () => {
    setOpen(false);
    setDialogData(null);
  };

  const handleSave = () => {
    if (dialogData) {
      invoke('update_exam_transaction', { ...dialogData })
        .then(() => {
          setExamTransactions((prev) =>
            prev.map((trans) =>
              trans.transaction_id === dialogData.transaction_id ? dialogData : trans
            )
          );
          handleDialogClose();
        })
        .catch((err) => console.error(err));
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Report Management
      </Typography>

      <TextField
        label="Select Date"
        type="date"
        value={selectedDate}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
        InputLabelProps={{
          shrink: true,
        }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Subject Code</TableCell>
              <TableCell>Room Number</TableCell>
              <TableCell>Shift ID</TableCell>
              <TableCell>Transaction Date</TableCell>
              <TableCell>Proctor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {examTransactions.map((transaction) => (
              <TableRow key={transaction.transaction_id}>
                <TableCell>{transaction.transaction_id}</TableCell>
                <TableCell>{transaction.subject_code}</TableCell>
                <TableCell>{transaction.room_number}</TableCell>
                <TableCell>{transaction.shift_id}</TableCell>
                <TableCell>{transaction.transaction_date}</TableCell>
                <TableCell>{transaction.proctor}</TableCell>
                <TableCell>{transaction.status}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleDialogOpen(transaction)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleDialogClose}>
        <DialogTitle>Edit Exam Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Modify the details of the exam transaction.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Proctor"
            type="text"
            fullWidth
            value={dialogData?.proctor || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDialogData({ ...dialogData, proctor: e.target.value } as ExamTransaction)
            }
          />
          <TextField
            margin="dense"
            label="Status"
            type="text"
            fullWidth
            value={dialogData?.status || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDialogData({ ...dialogData, status: e.target.value } as ExamTransaction)
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}