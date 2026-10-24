/* Lumina — veritabanı şeması (SQL Server)
   Çalıştırma: SSMS'de bu dosyayı açıp çalıştırın. Tekrar çalıştırmak güvenlidir. */
IF DB_ID('LuminaDB') IS NULL CREATE DATABASE LuminaDB;
GO
USE LuminaDB;
GO

IF OBJECT_ID('dbo.Languages', 'U') IS NULL
CREATE TABLE dbo.Languages (
    Id   INT NOT NULL PRIMARY KEY,
    Code NVARCHAR(10)  NOT NULL UNIQUE,
    Name NVARCHAR(100) NOT NULL
);
GO

IF OBJECT_ID('dbo.Words', 'U') IS NULL
CREATE TABLE dbo.Words (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    LanguageId     INT NOT NULL REFERENCES dbo.Languages(Id),
    OriginalWord   NVARCHAR(255) NOT NULL,
    TranslatedWord NVARCHAR(255) NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Languages)
INSERT INTO dbo.Languages (Id, Code, Name) VALUES
    (1, 'en', N'İngilizce'), (2, 'de', N'Almanca'), (3, 'fr', N'Fransızca'),
    (4, 'sv', N'İsveççe'),   (5, 'es', N'İspanyolca'), (6, 'no', N'Norveççe');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Words_Language')
CREATE INDEX IX_Words_Language ON dbo.Words (LanguageId, Id);
GO

/* İngilizce kelimeleri CSV'den yüklemek için (UTF-8 veya 1254 kodlu, ';' ayraçlı "İngilizce.csv"):
   önce hazırlık tablosuna yükleyin, sonra Words'e aktarın.

   CREATE TABLE #Stage (Kelime NVARCHAR(255), Turkce NVARCHAR(255), V1 NVARCHAR(100), V2 NVARCHAR(100), V3 NVARCHAR(100));
   BULK INSERT #Stage FROM 'C:\Veri\Ingilizce.csv'
     WITH (FORMAT='CSV', FIRSTROW=2, FIELDTERMINATOR=';', ROWTERMINATOR='0x0d0a', CODEPAGE='1254');
   INSERT INTO dbo.Words (LanguageId, OriginalWord, TranslatedWord) SELECT 1, Kelime, Turkce FROM #Stage;
*/
