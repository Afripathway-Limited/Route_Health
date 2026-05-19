<?php

namespace App\Mail;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InviteUserMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly string $tempPassword,
        public readonly Organization $organization,
        public string $loginUrl = '',
    ) {
        if (empty($this->loginUrl)) {
            $this->loginUrl = config('app.frontend_url', config('app.url')) . '/login';
        }
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to {$this->organization->name} on RouteHealth",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invite-user',
            with: [
                'user' => $this->user,
                'tempPassword' => $this->tempPassword,
                'organization' => $this->organization,
                'loginUrl' => $this->loginUrl,
                'roleName' => ucfirst(str_replace('_', ' ', $this->user->getRoleName())),
            ],
        );
    }
}
