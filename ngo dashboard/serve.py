import http.server
import sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  {self.address_string()} — {args[0]} {args[1]}", flush=True)

port = 3000
print(f"Serving on http://localhost:{port}  (no-cache mode)", flush=True)
http.server.HTTPServer(('', port), NoCacheHandler).serve_forever()
