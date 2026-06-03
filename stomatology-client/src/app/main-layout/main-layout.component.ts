import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { User } from '../models/user.model';
import { Subscription } from 'rxjs';
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ProfileEditComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  user: User | null = null;
  private userSub!: Subscription;
  showProfileModal = false;

  ngOnInit(): void {
    this.userSub = this.auth.currentUser$.subscribe(user => this.user = user);

    // Если пользователь ещё не загружен, пытаемся получить профиль.
    // guard уже должен был это сделать, но для страховки:
    if (!this.user) {
      this.auth.getProfile().subscribe({
        error: () => this.router.navigate(['/login'])
      });
    }
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  openProfileModal(): void {
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }

  onProfileUpdated(): void {
    this.closeProfileModal();
    // После обновления профиля – перезагружаем данные пользователя
    this.auth.getProfile().subscribe();
  }
}