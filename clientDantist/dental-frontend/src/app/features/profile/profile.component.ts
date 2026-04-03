import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PatientService } from '../../core/services/patient.service';
import { User } from '../../models/user.model';
import { Patient } from '../../models/patient.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  editMode = false;
  profileForm: FormGroup;
  patients: Patient[] = [];
  searchQuery = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      first_name: [''],
      last_name: [''],
      avatar: ['']
    });
  }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.profileForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar
        });
      }
    });
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.patientService.getPatients(this.searchQuery).subscribe({
      next: (data) => {
        this.patients = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.loadPatients();
  }

  updateProfile(): void {
    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.editMode = false;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      window.location.href = '/login';
    });
  }
}