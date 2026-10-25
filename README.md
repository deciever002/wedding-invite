# RiaAndManas — A Wedding in Five Acts

A mobile-first wedding invitation that opens like a letter and then plays the selected celebration films automatically as one continuous sequence. Event details appear over the final moments of each film before a crossfade to the next scene. The supplied soundtrack attempts to start with the invitation; browser autoplay rules may require the guest to enable sound once.

The guest-link studio at `/admin.html` creates a shareable link for each guest name, family side, and selected celebration, then copies the full invitation message with its personal link. Bride-side Sukhmani Sahib defaults to 19th November 2026; its date can be changed per invitation. The guest name is shown in the opening letter. This is a static client-side tool; it does not save a guest list or send messages.

## Events

- 19 November, 10:00 AM: Janeu Ceremony at Rihayash, Rajnagar, Nagpur
- 20 November, 11:00 AM: Haldi Carnival at Dublin, Nagpur
- 20 November, 7:00 PM: Sangeet Ceremony at Dublin, Nagpur
- 21 November, 10:00 AM: Baarat at Signature Resorts, Nagpur
- 21 November, 7:00 PM: Wedding Reception at Signature Resorts, Nagpur

## Preview locally

Run this command from the repository root:

```sh
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/` for the invitation or `http://127.0.0.1:8765/admin.html` for the guest-link studio.

## GitHub Pages

The repository is public, and GitHub Pages is configured to use **GitHub Actions** as its source. The workflow in `.github/workflows/deploy.yml` publishes the static site after a push to `main`. Once deployment completes, the site address is:

`https://riawedsmanas.github.io/wedding-invite/`

The admin page starts with that address and also lets you edit it.

## Soundtrack

`assets/audio/wedding-track.mp3` contains the supplied soundtrack. Event films are silent so the soundtrack can play separately without overlapping clip audio.

## Event media

Each film is stored in `assets/events/` as an H.264 MP4, with a matching JPG poster used while it loads and as a blurred full-screen backdrop. Videos are rendered uncropped, and event effects are CSS/SVG transition animations that play between films rather than over the video.
