USE Lumina;
GO

DROP TABLE IF EXISTS Words;

CREATE TABLE Words (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EnglishWord NVARCHAR(255),
    TurkishMeaning NVARCHAR(255)
);
GO

BULK INSERT Words
FROM 'C:\Oxford_3000_TR.csv'
WITH (
    FORMAT = 'CSV',
    FIRSTROW = 2,          
    FIELDTERMINATOR = ';', 
    ROWTERMINATOR = '\n',  
    CODEPAGE = '65001'     
);
GO