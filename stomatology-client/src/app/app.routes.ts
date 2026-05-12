import { Routes } from '@angular/router';
import { LoginComponent } from './auth/components/login.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { PatientDetailComponent } from './patients/components/patient-detail/patient-detail.component';
import { authGuard } from './auth/guards/auth.guard';
import { PatientsListComponent } from './patients/components/patients-list/patients-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'patients', component: PatientsListComponent },
      { path: 'patients/:id', component: PatientDetailComponent },
      { path: '', redirectTo: 'patients', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];