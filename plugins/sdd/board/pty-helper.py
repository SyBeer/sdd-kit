#!/usr/bin/env python3
# Pomocnik terminala sdd-board (spec: docs/specs/claude-dock.md). Tylko biblioteka standardowa.
# Uzycie: pty-helper.py <kolumny> <wiersze> <polecenie> [argumenty...]
# fd 0 -> wejscie terminala, terminal -> fd 1, fd 3: linie "<kolumny> <wiersze>" zmieniaja rozmiar.
# Zamkniecie fd 0 (koniec serwera) albo SIGTERM konczy program w terminalu.
import os, sys, pty, select, fcntl, termios, struct, signal, errno


def winsize(fd, cols, rows):
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))


def write_all(fd, data):
    while data:
        try:
            n = os.write(fd, data)
        except OSError as e:
            if e.errno == errno.EAGAIN:
                select.select([], [fd], [])
                continue
            raise
        data = data[n:]


def main():
    cols, rows, cmd = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]
    pid, master = pty.fork()
    if pid == 0:
        try:
            winsize(0, cols, rows)
            os.execvp(cmd[0], cmd)
        except Exception as e:
            sys.stderr.write('Nie moge uruchomic %s: %s\r\n' % (cmd[0], e))
        os._exit(127)

    winsize(master, cols, rows)

    def hangup(*_):
        try:
            os.kill(pid, signal.SIGHUP)
        except OSError:
            pass

    signal.signal(signal.SIGTERM, lambda *a: (hangup(), os._exit(143)))
    try:
        os.fstat(3)
        inputs = [0, master, 3]
    except OSError:
        inputs = [0, master]
    ctl = b''
    while True:
        try:
            ready, _, _ = select.select(inputs, [], [])
        except InterruptedError:
            continue
        if master in ready:
            try:
                data = os.read(master, 65536)
            except OSError:
                data = b''
            if not data:
                break
            write_all(1, data)
        if 0 in ready:
            data = os.read(0, 65536)
            if not data:
                hangup()
                inputs.remove(0)
            else:
                write_all(master, data)
        if 3 in ready:
            data = os.read(3, 4096)
            if not data:
                inputs.remove(3)
            else:
                ctl += data
                while b'\n' in ctl:
                    line, ctl = ctl.split(b'\n', 1)
                    parts = line.split()
                    if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                        winsize(master, int(parts[0]), int(parts[1]))
                        try:
                            os.killpg(os.tcgetpgrp(master), signal.SIGWINCH)
                        except OSError:
                            pass
    _, status = os.waitpid(pid, 0)
    sys.exit(os.waitstatus_to_exitcode(status) if hasattr(os, 'waitstatus_to_exitcode') else (status >> 8))


if __name__ == '__main__':
    main()
