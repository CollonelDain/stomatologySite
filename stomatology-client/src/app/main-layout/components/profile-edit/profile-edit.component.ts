import { Component, EventEmitter, Output, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';
import { User, UserProfileUpdate } from '../../../models/user.model';

@Component({
    selector: 'app-profile-edit',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profile-edit.component.html',
    styleUrls: ['./profile-edit.component.css']
})
export class ProfileEditComponent implements OnInit {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);

    @Input() user!: User;
    @Output() success = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    loading = false;
    errorMessage: string | null = null;
    avatarLetter: string = '?';

    profileForm = this.fb.group({
        first_name: ['', Validators.required],
        last_name: ['', Validators.required]
    });

    ngOnInit(): void {
        if (this.user) {
            this.profileForm.patchValue({
                first_name: this.user.first_name,
                last_name: this.user.last_name
            });
            this.avatarLetter = (this.user.first_name && this.user.first_name.charAt(0)) || '?';
        }
    }

    onSubmit(): void {
        if (this.profileForm.invalid) return;
        this.loading = true;
        this.errorMessage = null;

        const formValue = this.profileForm.value;
        const payload: UserProfileUpdate = {
            first_name: formValue.first_name || undefined,
            last_name: formValue.last_name || undefined
        };

        this.auth.updateProfile(payload).subscribe({
            next: () => {
                this.success.emit();
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.detail || 'Ошибка обновления профиля';
            }
        });
    }

    onCancel(): void {
        this.cancel.emit();
    }
}