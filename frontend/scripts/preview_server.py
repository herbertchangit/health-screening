"""Serve an Expo Router static export with clean and dynamic route support."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


DIST_DIR = Path(__file__).resolve().parent.parent / "dist"

DYNAMIC_ROUTES = (
    (re.compile(r"^/event/[^/]+/?$"), "/event/[id].html"),
    (re.compile(r"^/doctor/[^/]+/?$"), "/doctor/[id].html"),
    (re.compile(r"^/appointment/[^/]+/?$"), "/appointment/[id].html"),
    (re.compile(r"^/news/[^/]+/?$"), "/news/[id].html"),
    (re.compile(r"^/assign-doctors/[^/]+/?$"), "/assign-doctors/[eventId].html"),
    (
        re.compile(r"^/booking/[^/]+/[^/]+/?$"),
        "/booking/[eventId]/[doctorId].html",
    ),
)


class ExpoStaticHandler(SimpleHTTPRequestHandler):
    def _route_path(self) -> str:
        request_path = unquote(urlsplit(self.path).path)

        if request_path == "/":
            return "/index.html"

        relative_path = request_path.lstrip("/")
        if (DIST_DIR / relative_path).is_file():
            return request_path

        html_path = f"{request_path.rstrip('/')}.html"
        if (DIST_DIR / html_path.lstrip("/")).is_file():
            return html_path

        for pattern, route_template in DYNAMIC_ROUTES:
            if pattern.match(request_path):
                return route_template

        return "/+not-found.html"

    def do_GET(self) -> None:
        self.path = self._route_path()
        super().do_GET()

    def do_HEAD(self) -> None:
        self.path = self._route_path()
        super().do_HEAD()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    handler = partial(ExpoStaticHandler, directory=str(DIST_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", 4173), handler)
    print("Serving Expo build at http://127.0.0.1:4173", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
