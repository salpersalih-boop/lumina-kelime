"""Yerel sunucu: dosya varsa onu verir, yoksa index.html (temiz adresler için: /football/groups/3).
Kullanım: python dev-server.py [port]   (Baslat.bat bunu Node yoksa kullanır)"""
import http.server, os, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path.split('?', 1)[0])
        if not os.path.exists(path) and not os.path.splitext(path)[1]:
            self.path = '/index.html'
        return super().send_head()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Lumina: http://localhost:{PORT}')
    httpd.serve_forever()
