import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  errorMessage: string | null = null;
  loading = false;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;
    const { email, password } = this.loginForm.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.errorMessage = 'Неверный email или пароль';
        } else {
          this.errorMessage = 'Ошибка сервера, попробуйте позже';
        }
      }
    });
  }
}