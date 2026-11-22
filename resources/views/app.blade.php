
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <!-- Animated IC Favicon -->
    <link
        id="app-favicon"
        rel="icon"
        href="{{ asset('Telford.png') }}"
        type="image/png"
    >

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Scripts -->
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead

    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>

<body class="font-sans antialiased">
    @inertia

    <script>
        // Theme
        const theme = localStorage.getItem("theme") || "lofi";
        document.documentElement.setAttribute("data-theme", theme);

        // Animated Reel Favicon
        (() => {
            const favicon = document.getElementById('app-favicon');
            if (!favicon) return;

            const COLOR = '#ff6a83';
            const MARKER = '#ffd6dd'; // lighter tint so the rotation is visible
            const size = 64;
            const c = size / 2;

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const HOLES = 6;
            let frame = 0;

            // Tape: from the top-left corner, tangent to a core circle of radius R
            const TAPE_R = 12;
            const dx = c, dy = c;                      // corner (0,0) -> center
            const dist = Math.hypot(dx, dy);
            const tapeAngle = Math.atan2(dy, dx) - Math.asin(TAPE_R / dist);
            const tapeLen = Math.sqrt(dist * dist - TAPE_R * TAPE_R);
            const tx = Math.cos(tapeAngle), ty = Math.sin(tapeAngle);
            const tapeStart = [-4 * tx, -4 * ty];      // start slightly off-canvas so the corner is fully covered
            const tapeEnd = [tapeLen * tx, tapeLen * ty];

            function drawFavicon() {
                ctx.clearRect(0, 0, size, size);

                const angle = frame * (Math.PI / 18); // 10° per frame

                // Reel flange
                ctx.globalCompositeOperation = 'source-over';
                ctx.beginPath();
                ctx.arc(c, c, 28, 0, Math.PI * 2);
                ctx.fillStyle = COLOR;
                ctx.fill();

                ctx.save();
                ctx.translate(c, c);
                ctx.rotate(angle);

                // Cut the spokes' holes out of the flange
                ctx.globalCompositeOperation = 'destination-out';
                for (let i = 0; i < HOLES; i++) {
                    const a = (i / HOLES) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * 15, Math.sin(a) * 15, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Hub hole
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalCompositeOperation = 'source-over';

                // Spindle
                ctx.beginPath();
                ctx.arc(0, 0, 2, 0, Math.PI * 2);
                ctx.fillStyle = COLOR;
                ctx.fill();

                // Rotation marker (the holes are symmetric, so without
                // this the spin looks like it's jittering)
                ctx.beginPath();
                ctx.arc(22.5, 0, 2, 0, Math.PI * 2);
                ctx.fillStyle = MARKER;
                ctx.fill();

                ctx.restore();

                // Tape (stationary, drawn on top of the spinning reel)
                ctx.lineCap = 'butt';

                // Cut a thin transparent channel so the tape stays visible over the flange
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(...tapeStart);
                ctx.lineTo(...tapeEnd);
                ctx.stroke();

                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = COLOR;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(...tapeStart);
                ctx.lineTo(...tapeEnd);
                ctx.stroke();

                favicon.href = canvas.toDataURL('image/png');
                frame++;
            }

            drawFavicon();

            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                setInterval(drawFavicon, 120);
            }
        })();
    </script>
</body>

</html>
