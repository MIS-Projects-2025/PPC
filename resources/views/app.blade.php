
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

        // Animated Semiconductor IC Favicon
        (() => {
            const favicon = document.getElementById('app-favicon');

            if (!favicon) return;

            const canvas = document.createElement('canvas');
            const size = 64;

            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            let frame = 0;

            // IC pins arranged clockwise
            const pins = [];

            // Top
            for (let i = 0; i < 4; i++) {
                const x = 22 + i * 7;
                pins.push([x, 6, x, 16]);
            }

            // Right
            for (let i = 0; i < 4; i++) {
                const y = 22 + i * 7;
                pins.push([48, y, 58, y]);
            }

            // Bottom
            for (let i = 3; i >= 0; i--) {
                const x = 22 + i * 7;
                pins.push([x, 48, x, 58]);
            }

            // Left
            for (let i = 3; i >= 0; i--) {
                const y = 22 + i * 7;
                pins.push([6, y, 16, y]);
            }

            function drawFavicon() {
                ctx.clearRect(0, 0, size, size);

                const activePin = Math.floor(frame / 2) % pins.length;

                // Draw IC pins
                pins.forEach(([x1, y1, x2, y2], index) => {
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);

                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';

                    if (index === activePin) {
                        ctx.strokeStyle = '#22d3ee';
                        ctx.shadowColor = '#06b6d4';
                        ctx.shadowBlur = 9;
                    } else {
                        ctx.strokeStyle = '#94a3b8';
                        ctx.shadowBlur = 0;
                    }

                    ctx.stroke();
                });

                ctx.shadowBlur = 0;

                // Main IC package
                ctx.beginPath();
                ctx.roundRect(15, 15, 34, 34, 6);
                ctx.fillStyle = '#102a43';
                ctx.fill();

                ctx.lineWidth = 2;
                ctx.strokeStyle = '#7dd3fc';
                ctx.stroke();

                // Inner silicon die
                ctx.beginPath();
                ctx.roundRect(22, 22, 20, 20, 4);
                ctx.fillStyle = '#0c3a54';
                ctx.fill();

                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#22d3ee';
                ctx.stroke();

                // IC label
                ctx.fillStyle = '#e0f2fe';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('IC', 32, 33);

                // Animated signal indicator
                const pulse = 1.5 + Math.sin(frame * 0.3) * 0.7;

                ctx.beginPath();
                ctx.arc(40, 24, pulse, 0, Math.PI * 2);
                ctx.fillStyle = '#67e8f9';
                ctx.shadowColor = '#22d3ee';
                ctx.shadowBlur = 8;
                ctx.fill();

                ctx.shadowBlur = 0;

                // Update browser tab icon
                favicon.href = canvas.toDataURL('image/png');

                frame++;
            }

            // Initial render
            drawFavicon();

            // Animate every 120ms
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                setInterval(drawFavicon, 120);
            }
        })();
    </script>
</body>

</html>
