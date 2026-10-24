/* Lumina — Excel'den üretilen CSV'leri SQL Server'a TAM olarak yükler.
   Eski tabloları (Almanca, Fransızca, Isvecce, Ispanyolca, Norvecce) silip yeniden oluşturur.

   ÖNCE: "Lumına Kelime" klasöründeki CSV dosyalarını C:\LuminaData\ içine kopyalayın.
         (SQL Server hizmet hesabı Masaüstü/Kullanıcı klasörlerini okuyamaz.)
   Gereksinim: SQL Server 2017+ (BULK INSERT ... FORMAT='CSV'). */
USE LuminaDB;
GO

/* --- Tabloları yeniden oluştur (RowId = dosyadaki sıra; API bu sırayı kullanır) --- */
DROP TABLE IF EXISTS dbo.Almanca, dbo.[Fransızca], dbo.Isvecce, dbo.Ispanyolca, dbo.Norvecce;
DROP VIEW  IF EXISTS dbo.v_load_Almanca, dbo.v_load_Fransizca, dbo.v_load_Isvecce, dbo.v_load_Ispanyolca, dbo.v_load_Norvecce;

CREATE TABLE dbo.Almanca (
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    [Kelime ID] NVARCHAR(50), [Almanca Kelime] NVARCHAR(500), [Frekans] NVARCHAR(50), [Türkçe Anlamı] NVARCHAR(MAX));
CREATE TABLE dbo.[Fransızca] (
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    [Sıra] NVARCHAR(50), [Fransızca Kelime] NVARCHAR(500), [Tür] NVARCHAR(50), [Türkçe Anlamı] NVARCHAR(MAX),
    [V1 (Mastar)] NVARCHAR(200), [V2 (Geniş Zaman)] NVARCHAR(200), [V3 (Geçmiş Ortaç)] NVARCHAR(200));
CREATE TABLE dbo.Isvecce (
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    [Sıra] NVARCHAR(50), [Fransızca Kelime] NVARCHAR(500), [İsveççe Anlamı] NVARCHAR(MAX), [Türkçe Anlamı] NVARCHAR(MAX));
CREATE TABLE dbo.Ispanyolca (
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    [Sıra] NVARCHAR(50), [İspanyolca Kelime] NVARCHAR(500), [Tür] NVARCHAR(50), [Türkçe Anlamı] NVARCHAR(MAX));
CREATE TABLE dbo.Norvecce (
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    [Sıra] NVARCHAR(50), [Norveççe Kelime] NVARCHAR(500), [Tür] NVARCHAR(50), [Türkçe Anlamı] NVARCHAR(MAX));
GO

/* Kimlik sütunu dışındaki sütunlara yükleme yapmak için görünümler */
CREATE VIEW dbo.v_load_Almanca    AS SELECT [Kelime ID], [Almanca Kelime], [Frekans], [Türkçe Anlamı] FROM dbo.Almanca;
GO
CREATE VIEW dbo.v_load_Fransizca  AS SELECT [Sıra], [Fransızca Kelime], [Tür], [Türkçe Anlamı], [V1 (Mastar)], [V2 (Geniş Zaman)], [V3 (Geçmiş Ortaç)] FROM dbo.[Fransızca];
GO
CREATE VIEW dbo.v_load_Isvecce    AS SELECT [Sıra], [Fransızca Kelime], [İsveççe Anlamı], [Türkçe Anlamı] FROM dbo.Isvecce;
GO
CREATE VIEW dbo.v_load_Ispanyolca AS SELECT [Sıra], [İspanyolca Kelime], [Tür], [Türkçe Anlamı] FROM dbo.Ispanyolca;
GO
CREATE VIEW dbo.v_load_Norvecce   AS SELECT [Sıra], [Norveççe Kelime], [Tür], [Türkçe Anlamı] FROM dbo.Norvecce;
GO

DECLARE @dir NVARCHAR(400) = N'C:\LuminaData\';
DECLARE @sql NVARCHAR(MAX);

DECLARE @jobs TABLE (ViewName SYSNAME, FileName NVARCHAR(200));
INSERT INTO @jobs VALUES
    ('dbo.v_load_Almanca',    N'Almanca.csv'),
    ('dbo.v_load_Fransizca',  N'Fransızca.csv'),
    ('dbo.v_load_Isvecce',    N'Isvecce.csv'),
    ('dbo.v_load_Ispanyolca', N'Ispanyolca.csv'),
    ('dbo.v_load_Norvecce',   N'Norvecce.csv');

DECLARE @v SYSNAME, @f NVARCHAR(200);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT ViewName, FileName FROM @jobs;
OPEN c; FETCH NEXT FROM c INTO @v, @f;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'BULK INSERT ' + @v + N' FROM ''' + @dir + @f + N''' WITH (
        FORMAT = ''CSV'', FIELDQUOTE = ''"'', FIELDTERMINATOR = '';'',
        ROWTERMINATOR = ''0x0d0a'', FIRSTROW = 2, CODEPAGE = ''65001'', TABLOCK);';
    EXEC sys.sp_executesql @sql;
    FETCH NEXT FROM c INTO @v, @f;
END
CLOSE c; DEALLOCATE c;
GO

/* Kontrol: toplam satır ve çevirisi dolu satır sayısı (CSV'dekilerle aynı olmalı) */
SELECT 'Almanca'    AS Tablo, COUNT(*) AS Toplam, SUM(CASE WHEN LEN([Türkçe Anlamı]) > 0 THEN 1 ELSE 0 END) AS Cevirili FROM dbo.Almanca
UNION ALL SELECT 'Fransızca', COUNT(*), SUM(CASE WHEN LEN([Türkçe Anlamı]) > 0 THEN 1 ELSE 0 END) FROM dbo.[Fransızca]
UNION ALL SELECT 'Isvecce',   COUNT(*), SUM(CASE WHEN LEN([Türkçe Anlamı]) > 0 THEN 1 ELSE 0 END) FROM dbo.Isvecce
UNION ALL SELECT 'Ispanyolca',COUNT(*), SUM(CASE WHEN LEN([Türkçe Anlamı]) > 0 THEN 1 ELSE 0 END) FROM dbo.Ispanyolca
UNION ALL SELECT 'Norvecce',  COUNT(*), SUM(CASE WHEN LEN([Türkçe Anlamı]) > 0 THEN 1 ELSE 0 END) FROM dbo.Norvecce;
/* Beklenen: Almanca 30590/3899 · Fransızca 5724/5724 · Isvecce 5724/5724 · Ispanyolca 4000/4000 · Norvecce 1986/1986 */
