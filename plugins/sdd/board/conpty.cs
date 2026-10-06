// Pomocnik terminala sdd-board na Windows (spec: docs/specs/claude-dock.md, czesc "Windows 10 / 11", 0.33.0).
// Pseudokonsola ConPTY (Windows 10 1809+). Kompilowany przez Add-Type w Windows PowerShell 5.1 - tylko C# 5.
// Protokol: stdin = ramki [typ 1 B][dlugosc 4 B big-endian][dane]; 'd' -> wejscie terminala, 'r' -> "kolumny wiersze".
// stdout = surowe bajty z terminala (UTF-8 z sekwencjami VT). stderr = komunikaty pomocnika (UTF-8).
// Koniec: program w terminalu konczy sie -> kod wyjscia programu. Zamkniete stdin (koniec serwera) -> zamkniecie
// pseudokonsoli, do 3 s na zakonczenie, potem zakonczenie obiektu zadania. Zabicie pomocnika -> obiekt zadania
// (KILL_ON_JOB_CLOSE) konczy cale drzewo procesow programu.
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class SddConPty
{
    [StructLayout(LayoutKind.Sequential)]
    struct COORD { public short X; public short Y; }

    [StructLayout(LayoutKind.Sequential)]
    struct STARTUPINFO
    {
        public int cb; public IntPtr lpReserved; public IntPtr lpDesktop; public IntPtr lpTitle;
        public int dwX; public int dwY; public int dwXSize; public int dwYSize;
        public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags;
        public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2;
        public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize; public uint ActiveProcessLimit;
        public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount; public ulong WriteOperationCount; public ulong OtherOperationCount;
        public ulong ReadTransferCount; public ulong WriteTransferCount; public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed;
    }

    const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    const uint CREATE_SUSPENDED = 0x00000004;
    const int STARTF_USESTDHANDLES = 0x00000100;
    const int PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE = 0x00020016;
    const int JobObjectExtendedLimitInformation = 9;
    const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    const uint WAIT_OBJECT_0 = 0;

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern int CreatePseudoConsole(COORD size, SafeFileHandle hInput, SafeFileHandle hOutput, uint dwFlags, out IntPtr phPC);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern int ResizePseudoConsole(IntPtr hPC, COORD size);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern void ClosePseudoConsole(IntPtr hPC);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CreatePipe(out SafeFileHandle hReadPipe, out SafeFileHandle hWritePipe, IntPtr lpPipeAttributes, int nSize);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool InitializeProcThreadAttributeList(IntPtr lpAttributeList, int dwAttributeCount, int dwFlags, ref IntPtr lpSize);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool UpdateProcThreadAttribute(IntPtr lpAttributeList, uint dwFlags, IntPtr attribute, IntPtr lpValue, IntPtr cbSize, IntPtr lpPreviousValue, IntPtr lpReturnSize);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern void DeleteProcThreadAttributeList(IntPtr lpAttributeList);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode, EntryPoint = "CreateProcessW")]
    static extern bool CreateProcess(string lpApplicationName, StringBuilder lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes,
        bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFOEX lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint ResumeThread(IntPtr hThread);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode, EntryPoint = "CreateJobObjectW")]
    static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cbInfoLength);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);

    static Stream stderr;

    static void Say(string text)
    {
        try
        {
            if (stderr == null) stderr = Console.OpenStandardError();
            byte[] b = Encoding.UTF8.GetBytes(text + "\r\n");   // UTF-8, nie strona kodowa konsoli (852) - polskie znaki
            stderr.Write(b, 0, b.Length); stderr.Flush();
        }
        catch (Exception) { }
    }

    static COORD Size(int cols, int rows)
    {
        COORD c;
        c.X = (short)Math.Max(1, Math.Min(cols, 999));
        c.Y = (short)Math.Max(1, Math.Min(rows, 999));
        return c;
    }

    static bool ReadExactly(Stream s, byte[] buf, int count)
    {
        int off = 0;
        while (off < count)
        {
            int n = s.Read(buf, off, count - off);
            if (n <= 0) return false;
            off += n;
        }
        return true;
    }

    static string Win32Message(int code)
    {
        return new System.ComponentModel.Win32Exception(code).Message + " (" + code + ")";
    }

    public static int Run(int cols, int rows, string lineB64, string cwdB64)
    {
        string line = Encoding.UTF8.GetString(Convert.FromBase64String(lineB64));
        string cwd = Encoding.UTF8.GetString(Convert.FromBase64String(cwdB64));

        SafeFileHandle inRead, inWrite, outRead, outWrite;
        if (!CreatePipe(out inRead, out inWrite, IntPtr.Zero, 0) || !CreatePipe(out outRead, out outWrite, IntPtr.Zero, 0))
        {
            Say("Nie moge utworzyc rur terminala: " + Win32Message(Marshal.GetLastWin32Error()));
            return 126;
        }

        IntPtr hpc;
        int hr;
        try { hr = CreatePseudoConsole(Size(cols, rows), inRead, outWrite, 0, out hpc); }
        catch (EntryPointNotFoundException)
        {
            Say("Ten Windows nie ma pseudokonsoli (ConPTY) - potrzebny Windows 10 1809 lub nowszy.");
            return 126;
        }
        if (hr != 0)
        {
            Say("CreatePseudoConsole: blad 0x" + hr.ToString("X8"));
            return 126;
        }
        // Konce rur po stronie pseudokonsoli ma juz conhost - u nas niepotrzebne.
        inRead.Dispose(); outWrite.Dispose();

        IntPtr attrSize = IntPtr.Zero;
        InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref attrSize);
        IntPtr attrs = Marshal.AllocHGlobal(attrSize);
        if (!InitializeProcThreadAttributeList(attrs, 1, 0, ref attrSize) ||
            !UpdateProcThreadAttribute(attrs, 0, (IntPtr)PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE, hpc, (IntPtr)IntPtr.Size, IntPtr.Zero, IntPtr.Zero))
        {
            Say("Nie moge przypisac pseudokonsoli: " + Win32Message(Marshal.GetLastWin32Error()));
            ClosePseudoConsole(hpc);
            return 126;
        }

        STARTUPINFOEX si = new STARTUPINFOEX();
        si.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
        // stdio pomocnika jest przekierowane (rury do serwera) - bez tego program dziedziczylby nasze uchwyty
        // i pisal do serwera zamiast do pseudokonsoli. Puste uchwyty = program bierze konsole (ConPTY).
        si.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
        si.lpAttributeList = attrs;

        PROCESS_INFORMATION pi;
        bool ok = CreateProcess(null, new StringBuilder(line), IntPtr.Zero, IntPtr.Zero, false,
            EXTENDED_STARTUPINFO_PRESENT | CREATE_SUSPENDED, IntPtr.Zero, string.IsNullOrEmpty(cwd) ? null : cwd, ref si, out pi);
        if (!ok)
        {
            int err = Marshal.GetLastWin32Error();
            Say("Nie moge uruchomic: " + line + "\r\n" + Win32Message(err));
            ClosePseudoConsole(hpc);
            DeleteProcThreadAttributeList(attrs); Marshal.FreeHGlobal(attrs);
            return 127;
        }

        // Obiekt zadania: koniec pomocnika (Zakoncz, koniec serwera, zabicie) konczy cale drzewo programu.
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job != IntPtr.Zero)
        {
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            int len = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
            IntPtr p = Marshal.AllocHGlobal(len);
            Marshal.StructureToPtr(info, p, false);
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, p, (uint)len) || !AssignProcessToJobObject(job, pi.hProcess))
                Say("Uwaga: bez obiektu zadania (" + Win32Message(Marshal.GetLastWin32Error()) + ") - procesy potomne moga zostac po zamknieciu.");
            Marshal.FreeHGlobal(p);
        }
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);

        Stream stdout = Console.OpenStandardOutput();
        FileStream ptyOut = new FileStream(outRead, FileAccess.Read, 1, false);
        FileStream ptyIn = new FileStream(inWrite, FileAccess.Write, 1, false);

        // Wyjscie terminala -> stdout, czytane do konca (inaczej ClosePseudoConsole moze zawisnac).
        Thread reader = new Thread(delegate ()
        {
            byte[] buf = new byte[65536];
            try
            {
                int n;
                while ((n = ptyOut.Read(buf, 0, buf.Length)) > 0) { stdout.Write(buf, 0, n); stdout.Flush(); }
            }
            catch (Exception) { }
        });
        reader.IsBackground = true;
        reader.Start();

        // Ramki ze stdin -> wejscie terminala / rozmiar. Koniec stdin = koniec serwera.
        ManualResetEvent stdinClosed = new ManualResetEvent(false);
        IntPtr pc = hpc;
        Thread writer = new Thread(delegate ()
        {
            Stream stdin = Console.OpenStandardInput();
            byte[] head = new byte[5];
            try
            {
                while (ReadExactly(stdin, head, 5))
                {
                    int n = (head[1] << 24) | (head[2] << 16) | (head[3] << 8) | head[4];
                    if (n < 0 || n > 64 * 1024 * 1024) break;
                    byte[] body = new byte[n];
                    if (!ReadExactly(stdin, body, n)) break;
                    if (head[0] == (byte)'d') { ptyIn.Write(body, 0, n); ptyIn.Flush(); }
                    else if (head[0] == (byte)'r')
                    {
                        string[] parts = Encoding.ASCII.GetString(body).Split(' ');
                        int c, r;
                        if (parts.Length == 2 && int.TryParse(parts[0], out c) && int.TryParse(parts[1], out r))
                            ResizePseudoConsole(pc, Size(c, r));
                    }
                }
            }
            catch (Exception) { }
            stdinClosed.Set();
        });
        writer.IsBackground = true;
        writer.Start();

        // Czekaj na koniec programu albo koniec serwera.
        while (WaitForSingleObject(pi.hProcess, 100) != WAIT_OBJECT_0)
        {
            if (!stdinClosed.WaitOne(0)) continue;
            // Serwer zamknal wejscie: zamknij pseudokonsole (program dostaje CTRL_CLOSE_EVENT), daj 3 s, potem koniec drzewa.
            Thread closer = new Thread(delegate () { ClosePseudoConsole(pc); });
            closer.IsBackground = true;
            closer.Start();
            if (WaitForSingleObject(pi.hProcess, 3000) != WAIT_OBJECT_0 && job != IntPtr.Zero) TerminateJobObject(job, 1);
            WaitForSingleObject(pi.hProcess, 2000);
            hpc = IntPtr.Zero;
            break;
        }

        uint code;
        if (!GetExitCodeProcess(pi.hProcess, out code)) code = 1;
        // Ostatnia klatka ekranu: zamkniecie pseudokonsoli oproznia wyjscie, czytnik konczy sie na koncu rury.
        if (hpc != IntPtr.Zero)
        {
            Thread closer = new Thread(delegate () { ClosePseudoConsole(pc); });
            closer.IsBackground = true;
            closer.Start();
        }
        reader.Join(3000);
        try { stdout.Flush(); } catch (Exception) { }
        CloseHandle(pi.hProcess);
        DeleteProcThreadAttributeList(attrs); Marshal.FreeHGlobal(attrs);
        // Procesy potomne, ktore przezyly program (np. serwery w tle) - konczy je zamkniecie obiektu zadania przy wyjsciu.
        if (job != IntPtr.Zero) { TerminateJobObject(job, code); CloseHandle(job); }
        return unchecked((int)code);
    }
}
