import { CConsol } from "../../artgine/basic/CConsol.js";
import { CServerMain } from "../../artgine/network/CServerMain.js";
import { CBoardServer } from "../../artgine/server/CBoardServer.js";
import { CFileServer } from "../../artgine/server/CFileServer.js";
import { COAuthServer } from "../../artgine/server/COAuthServer.js";
import { CSingServer } from "../../artgine/server/CSingServer.js";


new CBoardServer().SetServerMain(CServerMain.Main());
new CSingServer().SetServerMain(CServerMain.Main());
new CFileServer().SetServerMain(CServerMain.Main());
new COAuthServer().SetServerMain(CServerMain.Main());





// import {  CORMField, CORMCondition, CORMOption } from "../../artgine/network/CORM.js";
// import { CJSON } from "../../artgine/basic/CJSON.js";
// import { CNe } from "../../artgine/network/CNe.js";

// CConsol.Log("Server Start",CConsol.eColor.green);

// // CNe Database Usage Sample
// async function NeDBSample() {
//     try {
//         // Create and initialize NeDB instance
//         const neDB = new CNe();
//         await neDB.Init();
        
//         CConsol.Log("=== NeDB Usage Sample Started ===", CConsol.eColor.cyan);

//         // 1. Insert user data
//         CConsol.Log("1. Inserting user data", CConsol.eColor.yellow);
//         await neDB.Insert("users", [
//             new CORMField("name", "John Doe"),
//             new CORMField("age", 30),
//             new CORMField("email", "john@example.com"),
//             new CORMField("createdAt", new Date())
//         ]);

//         await neDB.Insert("users", [
//             new CORMField("name", "Jane Smith"),
//             new CORMField("age", 25),
//             new CORMField("email", "jane@example.com"),
//             new CORMField("createdAt", new Date())
//         ]);

//         await neDB.Insert("users", [
//             new CORMField("name", "Bob Johnson"),
//             new CORMField("age", 28),
//             new CORMField("email", "bob@example.com"),
//             new CORMField("createdAt", new Date())
//         ]);

//         // 2. Query all users
//         CConsol.Log("2. Querying all users", CConsol.eColor.yellow);
//         const allUsers = await neDB.Select("users", [], ["name", "age", "email"], new CORMOption());
//         console.log("All users:", allUsers);

//         // 3. Conditional query (users age >= 25)
//         CConsol.Log("3. Conditional query (age >= 25)", CConsol.eColor.yellow);
//         const olderUsers = await neDB.Select("users", [
//             new CORMCondition("age", ">=", 25)
//         ], ["name", "age"], new CORMOption());
//         console.log("Users age >= 25:", olderUsers);

//         // 4. Specific user query
//         CConsol.Log("4. Specific user query (John Doe)", CConsol.eColor.yellow);
//         const johnUser = await neDB.Select("users", [
//             new CORMCondition("name", "==", "John Doe")
//         ], ["name", "age", "email"], new CORMOption());
//         console.log("John Doe info:", johnUser);

//         // 5. Update data
//         CConsol.Log("5. Updating data (John Doe age to 31)", CConsol.eColor.yellow);
//         await neDB.Update("users", [
//             new CORMCondition("name", "==", "John Doe")
//         ], [
//             new CORMField("age", 31)
//         ]);

//         // Verify update
//         const updatedJohn = await neDB.Select("users", [
//             new CORMCondition("name", "==", "John Doe")
//         ], ["name", "age"], new CORMOption());
//         console.log("Updated John Doe:", updatedJohn);

//         // 6. Sorting and pagination
//         CConsol.Log("6. Sorting and pagination (age desc, top 2)", CConsol.eColor.yellow);
//         const sortedUsers = await neDB.Select("users", [], ["name", "age"], {
//             ...new CORMOption(),
//             mOrderBy: "age desc",
//             mLimit: 2,
//             mLimitOffset: 0
//         });
//         console.log("Sorted users (top 2):", sortedUsers);

//         // 7. Complex condition query (AND)
//         CConsol.Log("7. Complex condition query (AND)", CConsol.eColor.yellow);
//         const complexQuery = await neDB.Select("users", [
//             new CORMCondition("age", ">=", 25, "and"),
//             new CORMCondition("age", "<=", 30, "and")
//         ], ["name", "age"], new CORMOption());
//         console.log("Users age 25-30:", complexQuery);

//         // 8. CJSON object storage (GridFS functionality)
//         CConsol.Log("8. CJSON object storage (GridFS functionality)", CConsol.eColor.yellow);
//         const userProfile = new CJSON({});
//         userProfile.Set("bio", "Hello! I am a developer.");
//         userProfile.Set("skills", ["JavaScript", "TypeScript", "Node.js"]);
//         userProfile.Set("address", {
//             city: "Seoul",
//             district: "Gangnam",
//             street: "Teheran-ro 123"
//         });

//         await neDB.Insert("profiles", [
//             new CORMField("userId", "user001"),
//             new CORMField("profile", userProfile),
//             new CORMField("lastUpdated", new Date())
//         ]);

//         // 9. CJSON object query
//         CConsol.Log("9. CJSON object query", CConsol.eColor.yellow);
//         const profiles = await neDB.Select("profiles", [], ["userId", "profile"], {
//             ...new CORMOption(),
//             mDownload: true
//         });
//         console.log("Profile info:", profiles);

//         // 10. Large text storage (GridFS auto processing)
//         CConsol.Log("10. Large text storage (GridFS auto processing)", CConsol.eColor.yellow);
//         const largeText = "A".repeat(100000); // 100k character large text
//         await neDB.Insert("documents", [
//             new CORMField("title", "Large Document"),
//             new CORMField("content", largeText),
//             new CORMField("createdAt", new Date())
//         ]);

//         // 11. Large text query
//         CConsol.Log("11. Large text query", CConsol.eColor.yellow);
//         const documents = await neDB.Select("documents", [], ["title", "content"], {
//             ...new CORMOption(),
//             mDownload: true
//         });
//         console.log("Document title:", (documents[0] as any)?.title);
//         console.log("Document content length:", (documents[0] as any)?.content?.length);

//         // 12. Delete data
//         CConsol.Log("12. Delete data (Jane Smith)", CConsol.eColor.yellow);
//         await neDB.Delete("users", [
//             new CORMCondition("name", "==", "Jane Smith")
//         ]);

//         // Verify deletion
//         const remainingUsers = await neDB.Select("users", [], ["name"], new CORMOption());
//         console.log("Remaining users after deletion:", remainingUsers);

//         // 13. Collection existence check
//         CConsol.Log("13. Collection existence check", CConsol.eColor.yellow);
//         const hasUsers = await neDB.IsCollection("users");
//         const hasNonExistent = await neDB.IsCollection("non_existent");
//         console.log("users collection exists:", hasUsers);
//         console.log("non_existent collection exists:", hasNonExistent);

//         // 14. Collection creation
//         CConsol.Log("14. Collection creation", CConsol.eColor.yellow);
//         await neDB.CreateCollection("products", [
//             new CORMField("name", "Sample Product"),
//             new CORMField("price", 1000),
//             new CORMField("category", "Electronics")
//         ], "name");

//         // Insert data into created collection
//         await neDB.Insert("products", [
//             new CORMField("name", "Laptop"),
//             new CORMField("price", 1500000),
//             new CORMField("category", "Electronics")
//         ]);

//         const products = await neDB.Select("products", [], ["name", "price"], new CORMOption());
//         console.log("Product list:", products);

//         // 15. Statistics
//         CConsol.Log("15. Statistics", CConsol.eColor.yellow);
//         const totalUsers = await neDB.Select("users", [], ["name"], new CORMOption());
//         const totalProfiles = await neDB.Select("profiles", [], ["userId"], new CORMOption());
//         const totalDocuments = await neDB.Select("documents", [], ["title"], new CORMOption());
//         const totalProducts = await neDB.Select("products", [], ["name"], new CORMOption());

//         console.log("=== Database Statistics ===");
//         console.log("User count:", totalUsers.length);
//         console.log("Profile count:", totalProfiles.length);
//         console.log("Document count:", totalDocuments.length);
//         console.log("Product count:", totalProducts.length);

//         // Close database connection
//         await neDB.Close();
        
//         CConsol.Log("=== NeDB Usage Sample Completed ===", CConsol.eColor.green);

//     } catch (error) {
//         CConsol.Log("NeDB sample execution error: " + error.message, CConsol.eColor.red);
//         console.error(error);
//     }
// }
// NeDBSample();


