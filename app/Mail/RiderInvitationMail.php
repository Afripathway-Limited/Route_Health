<?php

namespace App\Mail;

use App\Models\Rider;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RiderInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User   $user,
        public readonly Rider  $rider,
        public readonly string $inviteUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You\'ve been added to the RouteHealth platform — set your password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.rider-invitation',
            with: [
                'user'      => $this->user,
                'rider'     => $this->rider,
                'inviteUrl' => $this->inviteUrl,
            ],
        );
    }
}
