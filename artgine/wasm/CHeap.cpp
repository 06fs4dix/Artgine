#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/console.h>

#include <iostream>

using namespace emscripten;

#define AUTO_DELETE_MODE 1

class CHeap
{
public:
	CHeap() {}

	~CHeap() {
		#if AUTO_DELETE_MODE == 1
			//std::cout << m_ptr << " is deleted" << std::endl;
			delete[] (float*)m_ptr;
		#else
			//std::cout << m_ptr << " is collected" << std::endl;
			CHeap::m_deletedPtr.push_back((uint32_t)m_ptr);
		#endif
	}

	uint32_t GetPtr() const {
		return (uint32_t)m_ptr;
	}

	void SetPtr(uint32_t _ptr) {
		m_ptr = (void*)_ptr;
	}

	static void DeleteGarbages() {
		for(auto ptr : m_deletedPtr) {
			//std::cout << ptr << " is deleted" << std::endl;
			delete[] (float*)ptr;
		}
		m_deletedPtr.clear();
	}

private:
	void* m_ptr;

	inline static std::vector<uint32_t> m_deletedPtr;
};

EMSCRIPTEN_BINDINGS(ptr_module) 
{
	class_<CHeap>("CHeap")
	.smart_ptr_constructor("CHeap", &std::make_shared<CHeap>)
	.property("m_ptr", &CHeap::GetPtr, &CHeap::SetPtr)
	.class_function("DeleteGarbages", &CHeap::DeleteGarbages);
}