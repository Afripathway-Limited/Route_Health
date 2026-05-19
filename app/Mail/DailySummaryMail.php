<?php
namespace App\Mail;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DailySummaryMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Organization $organization,
        public array $stats
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Daily Operations Summary — {$this->organization->name} — " . now()->format('d M Y'));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.daily-summary');
    }
}
